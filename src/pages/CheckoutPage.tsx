import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useStore } from "../context/StoreContext";
import { confirmStripeCheckout, createStripeCheckoutSession } from "../utils/api";
import { formatCurrency } from "../utils/format";

const defaultForm = {
  fullName: "",
  email: "",
  address: "",
  city: "",
  zip: "",
  country: ""
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handledStripeSession = useRef<string | null>(null);
  const {
    currentUser,
    authToken,
    cartLines,
    cartSubtotal,
    shippingCost,
    cartTotal,
    placeOrder,
    refreshUserData
  } = useStore();
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stripeStatus = searchParams.get("stripe");
    const sessionId = searchParams.get("session_id");
    const token = authToken;

    if (!token || stripeStatus !== "success" || !sessionId) {
      if (stripeStatus === "cancelled") {
        setMessage("Stripe checkout was cancelled. You can try again.");
      }
      return;
    }

    if (handledStripeSession.current === sessionId) {
      return;
    }

    const activeToken = token as string;
    const activeSessionId = sessionId as string;
    handledStripeSession.current = sessionId;

    async function run() {
      setSubmitting(true);
      setMessage("Confirming Stripe payment...");
      try {
        const result = await confirmStripeCheckout(activeToken, activeSessionId);
        if (!result.paid) {
          setMessage("Stripe session is not paid yet. Please refresh shortly.");
          return;
        }

        await refreshUserData();
        setMessage("Stripe payment confirmed. Your order is now placed.");
        setTimeout(() => {
          navigate(`/account?order=${result.order.orderCode ?? result.order.id}`);
        }, 700);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Stripe confirmation failed.");
      } finally {
        setSubmitting(false);
      }
    }

    void run();
  }, [searchParams, authToken, refreshUserData, navigate]);

  if (!currentUser) {
    return (
      <PageShell>
        <section className="empty-state brutal-block">
          <h3>Sign in required for checkout.</h3>
          <p>Create an account or log in before placing an order.</p>
          <Link className="btn btn-dark" to="/auth">
            Go to Login/Register
          </Link>
        </section>
      </PageShell>
    );
  }

  if (cartLines.length === 0) {
    return (
      <PageShell>
        <section className="empty-state brutal-block">
          <h3>Your cart is empty.</h3>
          <p>Add products first, then complete shipping details here.</p>
          <Link className="btn btn-dark" to="/shop">
            Return to Shop
          </Link>
        </section>
      </PageShell>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    const result = await placeOrder(form);
    setMessage(result.message);
    setSubmitting(false);

    if (result.ok && result.orderId) {
      setTimeout(() => {
        navigate(`/account?order=${result.orderId}`);
      }, 700);
    }
  }

  async function onStripeCheckout() {
    const token = authToken;
    if (!token) {
      setMessage("Please sign in before launching Stripe checkout.");
      return;
    }

    setSubmitting(true);
    setMessage("Launching Stripe test checkout...");

    try {
      const response = await createStripeCheckoutSession(token, form);
      if (!response.url) {
        setMessage("Stripe session created but no redirect URL was returned.");
        setSubmitting(false);
        return;
      }

      window.location.assign(response.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to launch Stripe checkout.");
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <section className="section-head brutal-block">
        <div>
          <h2>Checkout</h2>
          <p>Use direct checkout or Stripe test checkout.</p>
        </div>
      </section>

      <section className="checkout-grid">
        <form className="checkout-form brutal-block" onSubmit={onSubmit}>
          <h3>Shipping Address</h3>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            className="text-input"
            value={form.fullName}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, fullName: event.target.value }));
            }}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="text-input"
            type="email"
            value={form.email}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, email: event.target.value }));
            }}
            required
          />

          <label htmlFor="address">Address</label>
          <input
            id="address"
            className="text-input"
            value={form.address}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, address: event.target.value }));
            }}
            required
          />

          <label htmlFor="city">City</label>
          <input
            id="city"
            className="text-input"
            value={form.city}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, city: event.target.value }));
            }}
            required
          />

          <label htmlFor="zip">ZIP</label>
          <input
            id="zip"
            className="text-input"
            value={form.zip}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, zip: event.target.value }));
            }}
            required
          />

          <label htmlFor="country">Country</label>
          <input
            id="country"
            className="text-input"
            value={form.country}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, country: event.target.value }));
            }}
            required
          />

          <div className="product-actions">
            <button className="btn btn-dark" type="submit" disabled={submitting}>
              Place Order Directly
            </button>
            <button
              className="btn btn-light"
              type="button"
              onClick={() => void onStripeCheckout()}
              disabled={submitting}
            >
              Pay with Stripe (Test)
            </button>
          </div>
          {message ? <p className="form-message">{message}</p> : null}
        </form>

        <aside className="cart-summary brutal-block">
          <h3>Order Review</h3>
          {cartLines.map((line) => (
            <div className="summary-line" key={line.product.id}>
              <span>
                {line.product.name} x {line.quantity}
              </span>
              <strong>{formatCurrency(line.lineTotal)}</strong>
            </div>
          ))}
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{formatCurrency(cartSubtotal)}</strong>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <strong>{shippingCost === 0 ? "Free" : formatCurrency(shippingCost)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{formatCurrency(cartTotal)}</strong>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
