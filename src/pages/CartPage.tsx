import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useStore } from "../context/StoreContext";
import { formatCurrency } from "../utils/format";

export default function CartPage() {
  const {
    cartLines,
    cartSubtotal,
    shippingCost,
    cartTotal,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  } = useStore();

  if (cartLines.length === 0) {
    return (
      <PageShell>
        <section className="empty-state brutal-block">
          <h3>Your cart is empty.</h3>
          <p>Start with the catalog and build a grounded capsule wardrobe.</p>
          <Link to="/shop" className="btn btn-dark">
            Browse Products
          </Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="section-head brutal-block">
        <div>
          <h2>Cart</h2>
          <p>Adjust quantities before moving to checkout.</p>
        </div>
        <button type="button" className="btn btn-light" onClick={clearCart}>
          Clear Cart
        </button>
      </section>

      <section className="cart-grid">
        <article className="cart-lines brutal-block">
          {cartLines.map((line) => (
            <div className="cart-line" key={line.product.id}>
              <img src={line.product.heroImage} alt={line.product.name} />
              <div>
                <h3>{line.product.name}</h3>
                <p>{line.product.tagline}</p>
                <strong>{formatCurrency(line.product.price)}</strong>
              </div>
              <div className="line-qty">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => {
                    updateCartQuantity(line.product.id, line.quantity - 1);
                  }}
                >
                  -
                </button>
                <span>{line.quantity}</span>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => {
                    updateCartQuantity(line.product.id, line.quantity + 1);
                  }}
                >
                  +
                </button>
              </div>
              <div className="line-total">
                <strong>{formatCurrency(line.lineTotal)}</strong>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    removeFromCart(line.product.id);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </article>

        <aside className="cart-summary brutal-block">
          <h3>Summary</h3>
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(cartSubtotal)}</strong>
          </div>
          <div>
            <span>Shipping</span>
            <strong>{shippingCost === 0 ? "Free" : formatCurrency(shippingCost)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{formatCurrency(cartTotal)}</strong>
          </div>
          <Link to="/checkout" className="btn btn-dark">
            Continue to Checkout
          </Link>
        </aside>
      </section>
    </PageShell>
  );
}
