import { type FormEvent, useCallback, useEffect, useState } from "react";
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

export default function AdminPage() {
	const { currentUser, authToken, refreshProducts } = useStore();
	const [adminProducts, setAdminProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState(defaultForm);

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
			const payload = {
				...form,
				slug: form.slug.trim().toLowerCase(),
				gallery: form.gallery.filter((entry) => entry.trim().length > 0),
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

	return (
		<PageShell>
			<section className="section-head brutal-block">
				<div>
					<h2>Admin Products</h2>
					<p>Create, update, and remove storefront products.</p>
				</div>
				<button
					type="button"
					className="btn btn-light"
					onClick={() => void loadProducts()}
				>
					Refresh
				</button>
			</section>

			<section className="admin-grid">
				<form className="checkout-form brutal-block" onSubmit={onSubmit}>
					<h3>{editingId ? `Edit Product #${editingId}` : "Create Product"}</h3>

					<label htmlFor="admin-slug">Slug</label>
					<input
						id="admin-slug"
						className="text-input"
						value={form.slug}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, slug: event.target.value }))
						}
						required
					/>

					<label htmlFor="admin-name">Name</label>
					<input
						id="admin-name"
						className="text-input"
						value={form.name}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, name: event.target.value }))
						}
						required
					/>

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
						rows={4}
						required
					/>

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
								rating: Math.max(
									0,
									Math.min(5, Number(event.target.value) || 0),
								),
							}))
						}
					/>

					<label htmlFor="admin-accent">Accent Color</label>
					<input
						id="admin-accent"
						className="text-input"
						value={form.accent}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, accent: event.target.value }))
						}
						required
					/>

					<label htmlFor="admin-hero">Hero Image URL</label>
					<input
						id="admin-hero"
						className="text-input"
						value={form.heroImage}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, heroImage: event.target.value }))
						}
						required
					/>

					<label htmlFor="admin-gallery">Gallery URLs (one per line)</label>
					<textarea
						id="admin-gallery"
						className="text-input"
						value={form.gallery.join("\n")}
						rows={4}
						onChange={(event) =>
							setForm((prev) => ({
								...prev,
								gallery: event.target.value
									.split("\n")
									.map((entry) => entry.trim())
									.filter(Boolean),
							}))
						}
						required
					/>

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
							}}
						>
							Reset
						</button>
					</div>
					{message ? <p className="form-message">{message}</p> : null}
				</form>

				<article className="account-card brutal-block">
					<h3>Catalog</h3>
					{loading ? <p>Loading products...</p> : null}
					<div className="order-list">
						{adminProducts.map((product) => (
							<div className="order-item" key={product.id}>
								<strong>
									#{product.id} {product.name}
								</strong>
								<span>{product.slug}</span>
								<span>
									${product.price} / stock {product.stock}
								</span>
								<div className="product-actions">
									<button
										type="button"
										className="btn btn-light"
										onClick={() => {
											setEditingId(product.id);
											setForm({
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
											});
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
