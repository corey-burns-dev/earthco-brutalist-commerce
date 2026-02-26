import type { CartItem, Order, Product, SessionUser } from "../types/models";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const raw = await response.text();
  const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : "Request failed.";
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export function getProducts() {
  return request<{ products: Product[] }>("/api/products");
}

export function register(name: string, email: string, password: string) {
  return request<{ user: SessionUser; token: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return request<{ user: SessionUser; token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchSession(token: string) {
  return request<{ user: SessionUser }>("/api/auth/me", {}, token);
}

export function logout(token: string) {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }, token);
}

export function fetchCart(token: string) {
  return request<{ cart: CartItem[] }>("/api/cart", {}, token);
}

export function addCartItem(token: string, productId: number, quantity = 1) {
  return request<{ cart: CartItem[] }>(
    "/api/cart",
    {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    },
    token,
  );
}

export function updateCartItem(token: string, productId: number, quantity: number) {
  return request<{ cart: CartItem[] }>(
    `/api/cart/${productId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    },
    token,
  );
}

export function removeCartItem(token: string, productId: number) {
  return request<{ cart: CartItem[] }>(`/api/cart/${productId}`, { method: "DELETE" }, token);
}

export function clearCart(token: string) {
  return request<{ cart: CartItem[] }>("/api/cart", { method: "DELETE" }, token);
}

export function fetchOrders(token: string) {
  return request<{ orders: Order[] }>("/api/orders", {}, token);
}

export interface CheckoutPayload {
  fullName: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  country: string;
}

export function checkout(token: string, payload: CheckoutPayload) {
  return request<{ order: Order }>(
    "/api/orders/checkout",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function createStripeCheckoutSession(token: string, payload: CheckoutPayload) {
  return request<{ sessionId: string; url: string; order: Order }>(
    "/api/stripe/checkout-session",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function confirmStripeCheckout(token: string, sessionId: string) {
  return request<{ paid: boolean; order: Order }>(
    `/api/stripe/confirm/${sessionId}`,
    { method: "POST" },
    token,
  );
}

export function getAdminProducts(token: string) {
  return request<{ products: Product[] }>("/api/admin/products", {}, token);
}

export function createAdminProduct(token: string, payload: Omit<Product, "id">) {
  return request<{ product: Product }>(
    "/api/admin/products",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function updateAdminProduct(
  token: string,
  productId: number,
  payload: Partial<Omit<Product, "id">>,
) {
  return request<{ product: Product }>(
    `/api/admin/products/${productId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function deleteAdminProduct(token: string, productId: number) {
  return request<{ ok: boolean }>(
    `/api/admin/products/${productId}`,
    {
      method: "DELETE",
    },
    token,
  );
}
