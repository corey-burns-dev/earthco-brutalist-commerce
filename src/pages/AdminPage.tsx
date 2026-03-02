import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useStore } from "../context/StoreContext";
import type { Product } from "../types/models";
import {
  ApiError,
  createAdminProduct,
  deleteAdminProduct,
  getAdminProducts,
  updateAdminProduct,
  uploadAdminImage,
} from "../utils/api";

const categories: Product["category"][] = [
  "OUTERWEAR",
  "FOOTWEAR",
  "BAGS",
  "ACCESSORIES",
  "ESSENTIALS",
];

const defaultForm: Omit<Product, "id"> = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  price: 99,
  category: "ESSENTIALS",
  accent: "#8b7355",
  heroImage:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200",
  gallery: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200",
  ],
  stock: 10,
  rating: 4.5,
};

function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Admin request failed.";
}

function toFormProduct(product: Product): Omit<Product, "id"> {
  return {
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    price: product.price,
    category: product.category,
    accent: product.accent,
    heroImage: product.heroImage,
    gallery: product.gallery,
    stock: product.stock,
    rating: product.rating,
  };
}

export default function AdminPage() {
  const { currentUser, authToken, refreshProducts } = useStore();
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [galleryUrlInput, setGalleryUrlInput] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const isAdmin = Boolean(currentUser?.isAdmin && authToken);

  const loadProducts = useCallback(async () => {
    if (!authToken) {
      return;
    }

    setLoading(true);
    try {
      const response = await getAdminProducts(authToken);
      setAdminProducts(response.products);
    } catch (error) {
      setMessage(toMessage(error));
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isAdmin && adminProducts.length === 0 && !loading) {
      void loadProducts();
    }
  }, [isAdmin, adminProducts.length, loading, loadProducts]);

  if (!currentUser) {
    return (
      <PageShell>
        <section className="empty-state brutal-block">
          <h3>Sign in required.</h3>
          <p>Only authenticated admins can access this dashboard.</p>
          <Link className="btn btn-dark" to="/auth?next=/admin">
            Go to Login
          </Link>
        </section>
      </PageShell>
    );
  }

  if (!currentUser.isAdmin || !authToken) {
    return (
      <PageShell>
        <section className="empty-state brutal-block">
          <h3>Admin access required.</h3>
          <p>Your current account does not have admin product privileges.</p>
          <Link className="btn btn-dark" to="/account">
            Return to Account
          </Link>
        </section>
      </PageShell>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = authToken;
    if (!token) {
      setMessage("Authentication is required.");
      return;
    }

    try {
      const gallery = form.gallery.map((entry) => entry.trim()).filter(Boolean);
      if (gallery.length === 0 && form.heroImage.trim()) {
        gallery.push(form.heroImage.trim());
      }

      const payload = {
        ...form,
        slug: form.slug.trim().toLowerCase(),
        heroImage: form.heroImage.trim(),
        gallery,
      };

      if (editingId) {
        await updateAdminProduct(token, editingId, payload);
        setMessage("Product updated.");
      } else {
        await createAdminProduct(token, payload);
        setMessage("Product created.");
      }

      setForm(defaultForm);
      setEditingId(null);
      setGalleryUrlInput("");
      await loadProducts();
      await refreshProducts();
    } catch (error) {
      setMessage(toMessage(error));
    }
  }

  async function onDelete(productId: number) {
    const token = authToken;
    if (!token) {
      setMessage("Authentication is required.");
      return;
    }

    try {
      await deleteAdminProduct(token, productId);
      setMessage("Product deleted.");
      await loadProducts();
      await refreshProducts();
    } catch (error) {
      setMessage(toMessage(error));
    }
  }

  async function onUploadHero(event: ChangeEvent<HTMLInputElement>) {
    const token = authToken;
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!token || !file) {
      return;
    }

    try {
      setUploadingHero(true);
      const { url } = await uploadAdminImage(token, file);
      setForm((prev) => ({ ...prev, heroImage: url }));
      setMessage("Hero image uploaded.");
    } catch (error) {
      setMessage(toMessage(error));
    } finally {
      setUploadingHero(false);
    }
  }

  async function onUploadGallery(event: ChangeEvent<HTMLInputElement>) {
    const token = authToken;
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!token || !file) {
      return;
    }

    try {
      setUploadingGallery(true);
      const { url } = await uploadAdminImage(token, file);
      setForm((prev) => ({
        ...prev,
        gallery: [...prev.gallery, url].slice(0, 6),
      }));
      setMessage("Gallery image uploaded.");
    } catch (error) {
      setMessage(toMessage(error));
    } finally {
      setUploadingGallery(false);
    }
  }

  function onAddGalleryUrl() {
    const url = galleryUrlInput.trim();
    if (!url) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      gallery: [...prev.gallery, url].slice(0, 6),
    }));
    setGalleryUrlInput("");
  }

  function onRemoveGalleryImage(index: number) {
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, entryIndex) => entryIndex !== index),
    }));
  }

  return (
    <PageShell>
      <section className="admin-layout">
        <div className="admin-main-stack">
          <section className="section-head brutal-block">
            <div>
              <h2>Admin Products</h2>
              <p>Compact catalog editor with image upload and live previews.</p>
            </div>
            <button type="button" className="btn btn-light" onClick={() => void loadProducts()}>
              Refresh
            </button>
          </section>

          <article className="admin-editor brutal-block">
            <h3>{editingId ? `Edit Product #${editingId}` : "Create Product"}</h3>
            <form className="admin-form" onSubmit={onSubmit}>
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label htmlFor="admin-slug">Slug</label>
                  <input
                    id="admin-slug"
                    className="text-input"
                    value={form.slug}
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="admin-name">Name</label>
                  <input
                    id="admin-name"
                    className="text-input"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>

                <div className="admin-field admin-field-span-2">
                  <label htmlFor="admin-tagline">Tagline</label>
                  <input
                    id="admin-tagline"
                    className="text-input"
                    value={form.tagline}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, tagline: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="admin-field admin-field-span-2">
                  <label htmlFor="admin-description">Description</label>
                  <textarea
                    id="admin-description"
                    className="text-input"
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="admin-category">Category</label>
                  <select
                    id="admin-category"
                    className="text-input"
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category: event.target.value as Product["category"],
                      }))
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-field">
                  <label htmlFor="admin-price">Price</label>
                  <input
                    id="admin-price"
                    className="text-input"
                    type="number"
                    min={1}
                    value={form.price}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        price: Math.max(1, Number(event.target.value) || 1),
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="admin-stock">Stock</label>
                  <input
                    id="admin-stock"
                    className="text-input"
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        stock: Math.max(0, Number(event.target.value) || 0),
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="admin-rating">Rating</label>
                  <input
                    id="admin-rating"
                    className="text-input"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={form.rating}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        rating: Math.max(0, Math.min(5, Number(event.target.value) || 0)),
                      }))
                    }
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="admin-accent">Accent</label>
                  <div className="admin-accent-row">
                    <input
                      id="admin-accent"
                      className="admin-color-input"
                      type="color"
                      value={form.accent}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, accent: event.target.value }))
                      }
                    />
                    <input
                      className="text-input"
                      value={form.accent}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, accent: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="admin-media">
                <div className="admin-media-head">
                  <label htmlFor="admin-hero">Hero Image URL</label>
                  <label className="btn btn-light admin-upload-btn" htmlFor="admin-hero-upload">
                    {uploadingHero ? "Uploading..." : "Upload Hero"}
                  </label>
                  <input
                    id="admin-hero-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={onUploadHero}
                    disabled={uploadingHero}
                    hidden
                  />
                </div>
                <input
                  id="admin-hero"
                  className="text-input"
                  value={form.heroImage}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, heroImage: event.target.value }))
                  }
                  required
                />
                {form.heroImage ? (
                  <div className="admin-hero-preview">
                    <img src={form.heroImage} alt="Hero preview" />
                  </div>
                ) : null}
              </div>

              <div className="admin-media">
                <div className="admin-media-head">
                  <label htmlFor="admin-gallery-url">Gallery Images</label>
                  <label className="btn btn-light admin-upload-btn" htmlFor="admin-gallery-upload">
                    {uploadingGallery ? "Uploading..." : "Upload Gallery"}
                  </label>
                  <input
                    id="admin-gallery-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={onUploadGallery}
                    disabled={uploadingGallery}
                    hidden
                  />
                </div>

                <div className="admin-gallery-add-row">
                  <input
                    id="admin-gallery-url"
                    className="text-input"
                    value={galleryUrlInput}
                    onChange={(event) => setGalleryUrlInput(event.target.value)}
                    placeholder="Paste image URL"
                  />
                  <button type="button" className="btn btn-light" onClick={onAddGalleryUrl}>
                    Add URL
                  </button>
                </div>

                {form.gallery.length > 0 ? (
                  <div className="admin-gallery-grid">
                    {form.gallery.map((image, index) => (
                      <div key={image} className="admin-gallery-item">
                        <img src={image} alt={`Gallery ${index + 1}`} />
                        <button
                          type="button"
                          className="btn btn-dark"
                          onClick={() => onRemoveGalleryImage(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-help">Add at least one gallery image (max 6).</p>
                )}
              </div>

              <div className="product-actions">
                <button type="submit" className="btn btn-dark">
                  {editingId ? "Save Product" : "Create Product"}
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => {
                    setEditingId(null);
                    setForm(defaultForm);
                    setGalleryUrlInput("");
                  }}
                >
                  Reset
                </button>
              </div>
              {message ? <p className="form-message">{message}</p> : null}
            </form>
          </article>
        </div>

        <article className="admin-catalog brutal-block">
          <h3>Catalog</h3>
          {loading ? <p>Loading products...</p> : null}
          <div className="admin-product-list">
            {adminProducts.map((product) => (
              <div className="admin-product-card" key={product.id}>
                <img src={product.heroImage} alt={product.name} />
                <div className="admin-product-meta">
                  <strong>
                    #{product.id} {product.name}
                  </strong>
                  <span>{product.slug}</span>
                  <span>
                    ${product.price} / stock {product.stock} / {product.rating.toFixed(1)}
                  </span>
                </div>
                <div className="product-actions">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => {
                      setEditingId(product.id);
                      setForm(toFormProduct(product));
                      setGalleryUrlInput("");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => void onDelete(product.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageShell>
  );
}
