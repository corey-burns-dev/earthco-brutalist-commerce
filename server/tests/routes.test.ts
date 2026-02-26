import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { createSessionToken } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "OrderLine", "Order", "CartItem", "Session", "User", "Product" RESTART IDENTITY CASCADE',
  );
}

async function createUserSession(email: string, isAdmin = false) {
  const user = await prisma.user.create({
    data: {
      name: email.split("@")[0] ?? "user",
      email,
      passwordHash: "hash",
      isAdmin
    }
  });

  const token = createSessionToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }
  });

  return { user, token };
}

const sampleProduct = {
  slug: "test-widget",
  name: "Test Widget",
  tagline: "A reliable test widget",
  description: "This widget is used in tests.",
  price: 100,
  category: "ESSENTIALS" as const,
  accent: "#123456",
  heroImage: "https://example.com/hero.jpg",
  gallery: ["https://example.com/gallery.jpg"],
  stock: 10,
  rating: 4.2
};

async function seedProduct(overrides: Partial<typeof sampleProduct> = {}) {
  return prisma.product.create({ data: { ...sampleProduct, ...overrides } });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("routes integration", () => {
  let server: Server;
  let baseUrl = "";

  function get(path: string, token?: string) {
    return fetch(`${baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  function post(path: string, body: unknown, token?: string) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
  }

  function patch(path: string, body: unknown, token?: string) {
    return fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
  }

  function del(path: string, token?: string) {
    return fetch(`${baseUrl}${path}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  beforeAll(() => {
    const app = createApp();
    server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // Auth
  // =========================================================================

  describe("auth", () => {
    test("register creates user and returns token", async () => {
      const res = await post("/api/auth/register", {
        name: "Alice",
        email: "alice@example.com",
        password: "password123"
      });
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.user.email).toBe("alice@example.com");
      expect(body.user.name).toBe("Alice");
      expect(typeof body.token).toBe("string");
    });

    test("register rejects duplicate email with 409", async () => {
      await post("/api/auth/register", {
        name: "Alice",
        email: "alice@example.com",
        password: "password123"
      });
      const res = await post("/api/auth/register", {
        name: "Alice 2",
        email: "alice@example.com",
        password: "password456"
      });
      expect(res.status).toBe(409);
    });

    test("register rejects invalid payload with 400", async () => {
      const res = await post("/api/auth/register", { email: "notanemail", password: "x" });
      expect(res.status).toBe(400);
    });

    test("login returns user and token for correct credentials", async () => {
      await post("/api/auth/register", {
        name: "Bob",
        email: "bob@example.com",
        password: "hunter2!"
      });

      const res = await post("/api/auth/login", {
        email: "bob@example.com",
        password: "hunter2!"
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.user.email).toBe("bob@example.com");
      expect(typeof body.token).toBe("string");
    });

    test("login rejects wrong password with 401", async () => {
      await post("/api/auth/register", {
        name: "Bob",
        email: "bob@example.com",
        password: "hunter2!"
      });
      const res = await post("/api/auth/login", {
        email: "bob@example.com",
        password: "wrongpassword"
      });
      expect(res.status).toBe(401);
    });

    test("login rejects unknown email with 401", async () => {
      const res = await post("/api/auth/login", {
        email: "ghost@example.com",
        password: "whatever"
      });
      expect(res.status).toBe(401);
    });

    test("/me returns the authenticated user", async () => {
      const { token } = await createUserSession("me-user@example.com");
      const res = await get("/api/auth/me", token);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.user.email).toBe("me-user@example.com");
    });

    test("/me rejects unauthenticated requests with 401", async () => {
      const res = await get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    test("logout invalidates the session", async () => {
      const { token } = await createUserSession("logout-user@example.com");
      const logoutRes = await post("/api/auth/logout", {}, token);
      expect(logoutRes.status).toBe(200);

      // Token should no longer work
      const meRes = await get("/api/auth/me", token);
      expect(meRes.status).toBe(401);
    });
  });

  // =========================================================================
  // Products
  // =========================================================================

  describe("products", () => {
    test("GET /api/products returns all products", async () => {
      await seedProduct({ slug: "product-a", name: "Product A" });
      await seedProduct({ slug: "product-b", name: "Product B" });
      const res = await get("/api/products");
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.products).toHaveLength(2);
    });

    test("GET /api/products?category= filters by category", async () => {
      await seedProduct({ slug: "essential-1", category: "ESSENTIALS" });
      await seedProduct({ slug: "outerwear-1", category: "OUTERWEAR" });
      const res = await get("/api/products?category=ESSENTIALS");
      const body = await res.json();
      expect(body.products).toHaveLength(1);
      expect(body.products[0].category).toBe("ESSENTIALS");
    });

    test("GET /api/products?q= searches by name", async () => {
      await seedProduct({ slug: "coffee-maker", name: "Coffee Maker" });
      await seedProduct({ slug: "tea-kettle", name: "Tea Kettle" });
      const res = await get("/api/products?q=coffee");
      const body = await res.json();
      expect(body.products).toHaveLength(1);
      expect(body.products[0].slug).toBe("coffee-maker");
    });

    test("GET /api/products/:slug returns a product", async () => {
      await seedProduct({ slug: "my-product" });
      const res = await get("/api/products/my-product");
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.product.slug).toBe("my-product");
    });

    test("GET /api/products/:slug returns 404 for unknown slug", async () => {
      const res = await get("/api/products/does-not-exist");
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // Cart
  // =========================================================================

  describe("cart", () => {
    test("GET /api/cart requires auth", async () => {
      const res = await get("/api/cart");
      expect(res.status).toBe(401);
    });

    test("GET /api/cart returns empty cart for new user", async () => {
      const { token } = await createUserSession("cart-empty@example.com");
      const res = await get("/api/cart", token);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.cart).toEqual([]);
    });

    test("POST /api/cart adds a product", async () => {
      const { token } = await createUserSession("cart-add@example.com");
      const product = await seedProduct();
      const res = await post("/api/cart", { productId: product.id }, token);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.cart).toHaveLength(1);
      expect(body.cart[0].productId).toBe(product.id);
      expect(body.cart[0].quantity).toBe(1);
    });

    test("POST /api/cart accumulates quantity for the same product", async () => {
      const { token } = await createUserSession("cart-accum@example.com");
      const product = await seedProduct();
      await post("/api/cart", { productId: product.id, quantity: 2 }, token);
      const res = await post("/api/cart", { productId: product.id, quantity: 3 }, token);
      const body = await res.json();
      expect(body.cart[0].quantity).toBe(5);
    });

    test("POST /api/cart returns 404 for unknown product", async () => {
      const { token } = await createUserSession("cart-404@example.com");
      const res = await post("/api/cart", { productId: 999999 }, token);
      expect(res.status).toBe(404);
    });

    test("PATCH /api/cart/:productId sets quantity", async () => {
      const { token } = await createUserSession("cart-patch@example.com");
      const product = await seedProduct();
      await post("/api/cart", { productId: product.id, quantity: 5 }, token);
      const res = await patch(`/api/cart/${product.id}`, { quantity: 2 }, token);
      const body = await res.json();
      expect(body.cart[0].quantity).toBe(2);
    });

    test("PATCH /api/cart/:productId with quantity 0 removes the item", async () => {
      const { token } = await createUserSession("cart-remove@example.com");
      const product = await seedProduct();
      await post("/api/cart", { productId: product.id }, token);
      const res = await patch(`/api/cart/${product.id}`, { quantity: 0 }, token);
      const body = await res.json();
      expect(body.cart).toEqual([]);
    });

    test("DELETE /api/cart/:productId removes a single item", async () => {
      const { token } = await createUserSession("cart-del-one@example.com");
      const p1 = await seedProduct({ slug: "p1", name: "P1" });
      const p2 = await seedProduct({ slug: "p2", name: "P2" });
      await post("/api/cart", { productId: p1.id }, token);
      await post("/api/cart", { productId: p2.id }, token);
      const res = await del(`/api/cart/${p1.id}`, token);
      const body = await res.json();
      expect(body.cart).toHaveLength(1);
      expect(body.cart[0].productId).toBe(p2.id);
    });

    test("DELETE /api/cart clears all items", async () => {
      const { token } = await createUserSession("cart-clear@example.com");
      const p1 = await seedProduct({ slug: "c1", name: "C1" });
      const p2 = await seedProduct({ slug: "c2", name: "C2" });
      await post("/api/cart", { productId: p1.id }, token);
      await post("/api/cart", { productId: p2.id }, token);
      const res = await del("/api/cart", token);
      const body = await res.json();
      expect(body.cart).toEqual([]);
    });
  });

  // =========================================================================
  // Orders
  // =========================================================================

  describe("orders", () => {
    const checkoutPayload = {
      fullName: "Test User",
      email: "test@example.com",
      address: "1 Main St",
      city: "Portland",
      zip: "97201",
      country: "US"
    };

    test("GET /api/orders returns user's orders (initially empty)", async () => {
      const { token } = await createUserSession("orders-list@example.com");
      const res = await get("/api/orders", token);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.orders).toEqual([]);
    });

    test("POST /api/orders/checkout creates order and clears cart", async () => {
      const { user, token } = await createUserSession("orders-checkout@example.com");
      const product = await seedProduct({ stock: 5, price: 300 }); // price > 250 → free shipping
      await prisma.cartItem.create({
        data: { userId: user.id, productId: product.id, quantity: 1 }
      });

      const res = await post("/api/orders/checkout", checkoutPayload, token);
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.order.status).toBe("PLACED");
      expect(body.order.shipping).toBe(0); // free shipping
      expect(body.order.lines).toHaveLength(1);
      expect(body.order.lines[0].productId).toBe(product.id);

      // Stock should decrease
      const updated = await prisma.product.findUnique({ where: { id: product.id } });
      expect(updated?.stock).toBe(4);

      // Cart should be cleared
      const cartRes = await get("/api/cart", token);
      const cartBody = await cartRes.json();
      expect(cartBody.cart).toEqual([]);
    });

    test("checkout computes $12 shipping under $250 subtotal", async () => {
      const { user, token } = await createUserSession("orders-shipping@example.com");
      const product = await seedProduct({ stock: 5, price: 100 });
      await prisma.cartItem.create({
        data: { userId: user.id, productId: product.id, quantity: 1 }
      });

      const res = await post("/api/orders/checkout", checkoutPayload, token);
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.order.shipping).toBe(12);
    });

    test("checkout returns 400 for empty cart", async () => {
      const { token } = await createUserSession("orders-empty@example.com");
      const res = await post("/api/orders/checkout", checkoutPayload, token);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.message).toMatch(/empty/i);
    });

    test("checkout returns 400 when product is out of stock", async () => {
      const { user, token } = await createUserSession("orders-oos@example.com");
      const product = await seedProduct({ stock: 0 });
      await prisma.cartItem.create({
        data: { userId: user.id, productId: product.id, quantity: 1 }
      });

      const res = await post("/api/orders/checkout", checkoutPayload, token);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.message).toMatch(/stock/i);
    });

    test("placed order appears in order history", async () => {
      const { user, token } = await createUserSession("orders-history@example.com");
      const product = await seedProduct({ stock: 2 });
      await prisma.cartItem.create({
        data: { userId: user.id, productId: product.id, quantity: 1 }
      });

      await post("/api/orders/checkout", checkoutPayload, token);

      const res = await get("/api/orders", token);
      const body = await res.json();
      expect(body.orders).toHaveLength(1);
      expect(body.orders[0].status).toBe("PLACED");
    });
  });

  // =========================================================================
  // Admin
  // =========================================================================

  describe("admin", () => {
    const newProductPayload = {
      slug: "admin-widget",
      name: "Admin Widget",
      tagline: "An admin-created product",
      description: "Created via the admin API in tests.",
      price: 200,
      category: "ESSENTIALS",
      accent: "#abcdef",
      heroImage: "https://example.com/hero.jpg",
      gallery: ["https://example.com/g1.jpg"],
      stock: 5,
      rating: 4.0
    };

    test("non-admin gets 403 on admin routes", async () => {
      const { token } = await createUserSession("regular@example.com", false);
      const res = await get("/api/admin/products", token);
      expect(res.status).toBe(403);
    });

    test("unauthenticated gets 401 on admin routes", async () => {
      const res = await get("/api/admin/products");
      expect(res.status).toBe(401);
    });

    test("admin can list products", async () => {
      const { token } = await createUserSession("admin-list@example.com", true);
      await seedProduct();
      const res = await get("/api/admin/products", token);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.products).toHaveLength(1);
    });

    test("admin can create a product", async () => {
      const { token } = await createUserSession("admin-create@example.com", true);
      const res = await post("/api/admin/products", newProductPayload, token);
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.product.slug).toBe("admin-widget");
    });

    test("admin create rejects duplicate slug with 409", async () => {
      const { token } = await createUserSession("admin-dup@example.com", true);
      await post("/api/admin/products", newProductPayload, token);
      const res = await post("/api/admin/products", newProductPayload, token);
      expect(res.status).toBe(409);
    });

    test("admin can patch a product", async () => {
      const { token } = await createUserSession("admin-patch@example.com", true);
      const product = await seedProduct();
      const res = await patch(`/api/admin/products/${product.id}`, { stock: 99 }, token);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.product.stock).toBe(99);
    });

    test("admin can delete a product with no order history", async () => {
      const { token } = await createUserSession("admin-delete@example.com", true);
      const product = await seedProduct();
      const res = await del(`/api/admin/products/${product.id}`, token);
      expect(res.status).toBe(200);
      const check = await prisma.product.findUnique({ where: { id: product.id } });
      expect(check).toBeNull();
    });

    test("admin cannot delete a product referenced in order lines", async () => {
      const { token } = await createUserSession("admin-del-blocked@example.com", true);
      const product = await seedProduct();
      const { user } = await createUserSession("customer@example.com");

      // Create an order that references the product
      await prisma.order.create({
        data: {
          orderCode: "EC-TEST-BLOCKED",
          userId: user.id,
          status: "PLACED",
          subtotal: 100,
          shipping: 12,
          total: 112,
          shippingFullName: "Customer",
          shippingEmail: "customer@example.com",
          shippingAddress: "1 St",
          shippingCity: "Portland",
          shippingZip: "97201",
          shippingCountry: "US",
          lines: {
            create: [
              {
                productId: product.id,
                productName: product.name,
                quantity: 1,
                unitPrice: product.price
              }
            ]
          }
        }
      });

      const res = await del(`/api/admin/products/${product.id}`, token);
      expect(res.status).toBe(409);
    });
  });
});
