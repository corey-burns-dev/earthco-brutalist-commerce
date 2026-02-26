import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/StoreContext";
import { formatCurrency } from "../utils/format";

export default function ProductPage() {
  const { slug } = useParams();
  const { getProductBySlug, products, addToCart } = useStore();
  const product = slug ? getProductBySlug(slug) : undefined;
  const [quantity, setQuantity] = useState(1);

  const related = useMemo(() => {
    if (!product) {
      return [];
    }

    return products
      .filter((entry) => entry.category === product.category && entry.id !== product.id)
      .slice(0, 3);
  }, [products, product]);

  if (!product) {
    return (
      <PageShell>
        <section className="empty-state brutal-block">
          <h3>Product not found.</h3>
          <p>This item may have moved or is no longer available.</p>
          <Link className="btn btn-dark" to="/shop">
            Return to Shop
          </Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="detail-grid">
        <article className="detail-media brutal-block">
          <img src={product.heroImage} alt={product.name} />
          <div className="mini-gallery">
            {product.gallery.map((image) => (
              <img key={image} src={image} alt={`${product.name} detail`} />
            ))}
          </div>
        </article>

        <article className="detail-content brutal-block">
          <p className="detail-category">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detail-tagline">{product.tagline}</p>
          <p className="detail-description">{product.description}</p>
          <div className="detail-metrics">
            <strong>{formatCurrency(product.price)}</strong>
            <span>{product.stock} in stock</span>
            <span>{product.rating.toFixed(1)} rating</span>
          </div>

          <div className="quantity-row">
            <label htmlFor="qty">Quantity</label>
            <input
              id="qty"
              className="text-input"
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(event) => {
                const next = Number(event.target.value);
                setQuantity(Number.isNaN(next) ? 1 : Math.max(1, Math.min(99, next)));
              }}
            />
          </div>

          <div className="product-actions">
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => {
                addToCart(product.id, quantity);
              }}
            >
              Add {quantity} to Cart
            </button>
            <Link className="btn btn-light" to="/cart">
              Open Cart
            </Link>
          </div>
        </article>
      </section>

      <section className="section-head brutal-block">
        <div>
          <h2>Related Pieces</h2>
          <p>Products from the same category that pair well in a look.</p>
        </div>
      </section>

      <section className="product-grid">
        {related.map((entry) => (
          <ProductCard key={entry.id} product={entry} onAddToCart={addToCart} />
        ))}
      </section>
    </PageShell>
  );
}
