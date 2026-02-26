import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { createSessionToken } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";
import { finalizeStripeOrder } from "../src/routes/stripe.js";

const checkoutPayload = {
  fullName: "Test User",
  email: "test@example.com",
  address: "123 Test St",
  city: "Portland",
  zip: "97201",
  country: "US",
};

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
      isAdmin,
    },
  });

  const token = createSessionToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return { user, token };
}

describe("server integration", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(() => {
    const app = createApp();
    server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to get test server port.");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await prisma.$disconnect();
  });

  test("prevents double-sell in concurrent direct checkout", async () => {
    const [{ user: userA, token: tokenA }, { user: userB, token: tokenB }] = await Promise.all([
      createUserSession("checkout-a@example.com"),
      createUserSession("checkout-b@example.com"),
    ]);

    const product = await prisma.product.create({
      data: {
        slug: "test-checkout-race",
        name: "Test Checkout Race",
        tagline: "Race test product",
        description: "Product for validating concurrent checkout stock handling.",
        price: 100,
        category: "ESSENTIALS",
        accent: "#333333",
        heroImage: "https://example.com/image.jpg",
        gallery: ["https://example.com/image.jpg"],
        stock: 1,
        rating: 4.5,
      },
    });

    await prisma.cartItem.createMany({
      data: [
        { userId: userA.id, productId: product.id, quantity: 1 },
        { userId: userB.id, productId: product.id, quantity: 1 },
      ],
    });

    const [responseA, responseB] = await Promise.all([
      fetch(`${baseUrl}/api/orders/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(checkoutPayload),
      }),
      fetch(`${baseUrl}/api/orders/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify(checkoutPayload),
      }),
    ]);

    const [bodyA, bodyB] = await Promise.all([responseA.json(), responseB.json()]);
    const statuses = [responseA.status, responseB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 400]);

    const messages = [bodyA, bodyB]
      .map((entry) => (entry && typeof entry === "object" ? entry.message : null))
      .filter((value): value is string => typeof value === "string");

    expect(messages.some((message) => message.toLowerCase().includes("stock"))).toBe(true);

    const stockAfter = await prisma.product.findUnique({
      where: { id: product.id },
      select: { stock: true },
    });
    expect(stockAfter?.stock).toBe(0);

    const orderCount = await prisma.order.count();
    expect(orderCount).toBe(1);
  });

  test("finalizeStripeOrder is idempotent across concurrent calls", async () => {
    const { user } = await createUserSession("stripe-idempotency@example.com");

    const product = await prisma.product.create({
      data: {
        slug: "test-stripe-idempotency",
        name: "Test Stripe Idempotency",
        tagline: "Stripe idempotency product",
        description: "Product for validating Stripe finalization idempotency.",
        price: 120,
        category: "ESSENTIALS",
        accent: "#444444",
        heroImage: "https://example.com/image.jpg",
        gallery: ["https://example.com/image.jpg"],
        stock: 3,
        rating: 4.4,
      },
    });

    await prisma.cartItem.create({
      data: {
        userId: user.id,
        productId: product.id,
        quantity: 2,
      },
    });

    await prisma.order.create({
      data: {
        orderCode: "EC-STRIPE-IDEMPOTENT-1",
        userId: user.id,
        status: "PENDING_PAYMENT",
        stripeSessionId: "cs_test_idempotent",
        subtotal: 240,
        shipping: 0,
        total: 240,
        shippingFullName: checkoutPayload.fullName,
        shippingEmail: checkoutPayload.email,
        shippingAddress: checkoutPayload.address,
        shippingCity: checkoutPayload.city,
        shippingZip: checkoutPayload.zip,
        shippingCountry: checkoutPayload.country,
        lines: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              quantity: 2,
              unitPrice: product.price,
            },
          ],
        },
      },
    });

    const [resultA, resultB] = await Promise.all([
      finalizeStripeOrder("cs_test_idempotent", user.id),
      finalizeStripeOrder("cs_test_idempotent", user.id),
    ]);

    expect(resultA.status).toBe("PLACED");
    expect(resultB.status).toBe("PLACED");

    const productAfter = await prisma.product.findUnique({
      where: { id: product.id },
      select: { stock: true },
    });
    expect(productAfter?.stock).toBe(1);

    const orderAfter = await prisma.order.findUnique({
      where: { stripeSessionId: "cs_test_idempotent" },
      select: { status: true },
    });
    expect(orderAfter?.status).toBe("PLACED");
  });

  test("admin endpoints return 404 for missing product update/delete", async () => {
    const { token } = await createUserSession("admin-404@example.com", true);

    const updateResponse = await fetch(`${baseUrl}/api/admin/products/999999`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: "Missing Product" }),
    });
    const updateBody = await updateResponse.json();
    expect(updateResponse.status).toBe(404);
    expect(updateBody.message).toBe("Product not found.");

    const deleteResponse = await fetch(`${baseUrl}/api/admin/products/999999`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const deleteBody = await deleteResponse.json();
    expect(deleteResponse.status).toBe(404);
    expect(deleteBody.message).toBe("Product not found.");
  });
});
