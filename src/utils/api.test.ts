import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  ApiError,
  addCartItem,
  checkout,
  clearCart,
  confirmStripeCheckout,
  createAdminProduct,
  createStripeCheckoutSession,
  deleteAdminProduct,
  fetchCart,
  fetchOrders,
  fetchSession,
  getAdminProducts,
  getProducts,
  login,
  logout,
  register,
  removeCartItem,
  updateAdminProduct,
  updateCartItem,
} from "./api";

describe("api helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  test("login sends JSON body and parses success response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user: { id: "1", name: "Casey", email: "casey@example.com", isAdmin: false },
          token: "token-123",
        }),
        { status: 200 },
      ),
    );

    const result = await login("casey@example.com", "password123");

    expect(result.token).toBe("token-123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "casey@example.com", password: "password123" }),
      }),
    );

    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestOptions.headers).get("Content-Type")).toBe("application/json");
  });

  test("fetchSession includes bearer token header", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user: { id: "2", name: "Riley", email: "riley@example.com", isAdmin: false },
        }),
        { status: 200 },
      ),
    );

    await fetchSession("session-token");

    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestOptions.headers).get("Authorization")).toBe("Bearer session-token");
  });

  test("throws ApiError with API message on non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Invalid credentials." }), { status: 401 }),
    );

    const request = login("casey@example.com", "wrong-password");

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 401,
      message: "Invalid credentials.",
    });
  });

  test("falls back to default request error message when response body is empty", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));

    await expect(fetchSession("bad-token")).rejects.toMatchObject({
      status: 500,
      message: "Request failed.",
    });
  });

  test("getProducts sends GET to /api/products", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [] }), { status: 200 }),
    );

    const result = await getProducts();

    expect(result.products).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/products"),
      expect.objectContaining({}),
    );
  });

  test("register sends name/email/password and returns token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user: { id: "3", name: "Sam", email: "sam@example.com", isAdmin: false },
          token: "reg-token",
        }),
        { status: 200 },
      ),
    );

    const result = await register("Sam", "sam@example.com", "pass");

    expect(result.token).toBe("reg-token");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/register"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Sam", email: "sam@example.com", password: "pass" }),
      }),
    );
  });

  test("logout sends POST with bearer token", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await logout("my-token");

    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestOptions.headers).get("Authorization")).toBe("Bearer my-token");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/logout"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("fetchCart sends GET with bearer token", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ cart: [] }), { status: 200 }));

    const result = await fetchCart("cart-token");

    expect(result.cart).toEqual([]);
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestOptions.headers).get("Authorization")).toBe("Bearer cart-token");
  });

  test("addCartItem sends POST with productId and quantity", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ cart: [{ productId: 5, quantity: 2 }] }), { status: 200 }),
    );

    const result = await addCartItem("tok", 5, 2);

    expect(result.cart[0]).toMatchObject({ productId: 5, quantity: 2 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/cart"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ productId: 5, quantity: 2 }),
      }),
    );
  });

  test("updateCartItem sends PATCH to /api/cart/:id", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ cart: [{ productId: 7, quantity: 3 }] }), { status: 200 }),
    );

    await updateCartItem("tok", 7, 3);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/cart/7"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ quantity: 3 }),
      }),
    );
  });

  test("removeCartItem sends DELETE to /api/cart/:id", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ cart: [] }), { status: 200 }));

    await removeCartItem("tok", 9);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/cart/9"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  test("clearCart sends DELETE to /api/cart", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ cart: [] }), { status: 200 }));

    await clearCart("tok");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/cart"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  test("fetchOrders returns orders array", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ orders: [] }), { status: 200 }));

    const result = await fetchOrders("tok");

    expect(result.orders).toEqual([]);
  });

  test("checkout sends POST with payload", async () => {
    const payload = {
      fullName: "Casey",
      email: "casey@example.com",
      address: "1 Main St",
      city: "Portland",
      zip: "97201",
      country: "US",
    };
    const fakeOrder = {
      id: "ord-1",
      userId: "u-1",
      createdAt: "2024-01-01T00:00:00Z",
      subtotal: 90,
      shipping: 12,
      total: 102,
      lines: [],
      shippingAddress: payload,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ order: fakeOrder }), { status: 200 }),
    );

    const result = await checkout("tok", payload);

    expect(result.order.id).toBe("ord-1");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/orders/checkout"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  test("createStripeCheckoutSession returns sessionId and url", async () => {
    const payload = {
      fullName: "Casey",
      email: "casey@example.com",
      address: "1 Main St",
      city: "Portland",
      zip: "97201",
      country: "US",
    };

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          sessionId: "sess_123",
          url: "https://stripe.com/pay/sess_123",
          order: {},
        }),
        { status: 200 },
      ),
    );

    const result = await createStripeCheckoutSession("tok", payload);

    expect(result.sessionId).toBe("sess_123");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/stripe/checkout-session"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("confirmStripeCheckout sends POST to /api/stripe/confirm/:id", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ paid: true, order: { id: "ord-2" } }), { status: 200 }),
    );

    const result = await confirmStripeCheckout("tok", "sess_abc");

    expect(result.paid).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/stripe/confirm/sess_abc"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("getAdminProducts sends GET with bearer token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [] }), { status: 200 }),
    );

    await getAdminProducts("admin-tok");

    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestOptions.headers).get("Authorization")).toBe("Bearer admin-tok");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/products"),
      expect.anything(),
    );
  });

  test("createAdminProduct sends POST with product payload", async () => {
    const payload = {
      slug: "new-shoe",
      name: "New Shoe",
      tagline: "Fresh kicks",
      description: "A shoe",
      price: 120,
      category: "FOOTWEAR" as const,
      accent: "#ffffff",
      heroImage: "https://example.com/shoe.jpg",
      gallery: [],
      stock: 10,
      rating: 4.5,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ product: { id: 99, ...payload } }), { status: 200 }),
    );

    const result = await createAdminProduct("admin-tok", payload);

    expect(result.product.id).toBe(99);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/products"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("updateAdminProduct sends PATCH to /api/admin/products/:id", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ product: { id: 5, name: "Updated" } }), { status: 200 }),
    );

    await updateAdminProduct("admin-tok", 5, { name: "Updated" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/products/5"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
    );
  });

  test("deleteAdminProduct sends DELETE to /api/admin/products/:id", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await deleteAdminProduct("admin-tok", 5);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/products/5"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
