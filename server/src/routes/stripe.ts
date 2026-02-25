import { OrderStatus } from "@prisma/client";
import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { auditLog, getRequestIp } from "../lib/audit.js";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/httpError.js";
import { computeShipping, createOrderWithRetry } from "../lib/orders.js";
import { prisma } from "../lib/prisma.js";
import { serializeOrder } from "../lib/serializers.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const checkoutSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1)
});

function getStripeClient() {
  if (!env.stripeSecretKey) {
    throw new HttpError(500, "Stripe is not configured on the server.");
  }

  return new Stripe(env.stripeSecretKey);
}

function getWebhookEvent(
  stripe: Stripe,
  payload: Buffer,
  signature: string | undefined,
) {
  if (!signature) {
    throw new HttpError(400, "Missing Stripe signature header.");
  }

  if (!env.stripeWebhookSecret) {
    throw new HttpError(500, "Stripe webhook secret is not configured on the server.");
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch {
    throw new HttpError(400, "Invalid Stripe webhook signature.");
  }
}

export async function finalizeStripeOrder(sessionId: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: { lines: true }
    });

    if (!existingOrder || (userId && existingOrder.userId !== userId)) {
      throw new HttpError(404, "No order found for this Stripe session.");
    }

    if (existingOrder.status === OrderStatus.PLACED || existingOrder.status === OrderStatus.FULFILLED) {
      return existingOrder;
    }

    if (existingOrder.status === OrderStatus.CANCELLED) {
      return existingOrder;
    }

    // Claim the transition from PENDING_PAYMENT -> PLACED once. This keeps stock updates idempotent.
    const transition = await tx.order.updateMany({
      where: {
        id: existingOrder.id,
        status: OrderStatus.PENDING_PAYMENT
      },
      data: {
        status: OrderStatus.PLACED
      }
    });

    if (transition.count === 0) {
      const latest = await tx.order.findUnique({
        where: { id: existingOrder.id },
        include: { lines: true }
      });

      if (!latest) {
        throw new HttpError(404, "No order found for this Stripe session.");
      }

      return latest;
    }

    for (const line of existingOrder.lines) {
      const stockUpdate = await tx.product.updateMany({
        where: {
          id: line.productId,
          stock: {
            gte: line.quantity
          }
        },
        data: {
          stock: {
            decrement: line.quantity
          }
        }
      });

      if (stockUpdate.count === 0) {
        throw new HttpError(409, `${line.productName} is out of stock.`);
      }
    }

    await tx.cartItem.deleteMany({
      where: {
        userId: existingOrder.userId
      }
    });

    const finalized = await tx.order.findUnique({
      where: { id: existingOrder.id },
      include: { lines: true }
    });

    if (!finalized) {
      throw new HttpError(404, "No order found for this Stripe session.");
    }

    return finalized;
  });
}

async function compensateStripeFulfillmentFailure(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (paymentIntent) {
    await stripe.refunds.create(
      {
        payment_intent: paymentIntent,
        reason: "requested_by_customer"
      },
      {
        idempotencyKey: `earthco-refund-${session.id}`
      },
    );
  }

  const cancelledOrder = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
    select: { id: true, userId: true, orderCode: true, status: true }
  });

  await prisma.order.updateMany({
    where: {
      stripeSessionId: session.id,
      status: OrderStatus.PENDING_PAYMENT
    },
    data: {
      status: OrderStatus.CANCELLED
    }
  });

  auditLog("stripe.order_cancelled_after_failed_fulfillment", {
    sessionId: session.id,
    orderId: cancelledOrder?.id,
    userId: cancelledOrder?.userId,
    orderCode: cancelledOrder?.orderCode,
    hadPaymentIntent: Boolean(paymentIntent)
  });
}

router.post("/webhook", async (request, response, next) => {
  const stripe = getStripeClient();
  const rawBody = request.body;
  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(typeof rawBody === "string" ? rawBody : "");

  const signature = request.headers["stripe-signature"];
  const stripeSignature = Array.isArray(signature) ? signature[0] : signature;

  let event: Stripe.Event;
  try {
    event = getWebhookEvent(stripe, bodyBuffer, stripeSignature);
  } catch (error) {
    next(error);
    return;
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        try {
          const finalized = await finalizeStripeOrder(session.id);
          auditLog("stripe.webhook_order_finalized", {
            eventType: event.type,
            sessionId: session.id,
            orderId: finalized.id,
            userId: finalized.userId,
            orderCode: finalized.orderCode,
            status: finalized.status
          });
        } catch (error) {
          if (
            error instanceof HttpError &&
            (error.status === 400 || error.status === 409)
          ) {
            await compensateStripeFulfillmentFailure(stripe, session);
            auditLog("stripe.webhook_compensated", {
              eventType: event.type,
              sessionId: session.id,
              reason: error.message
            });
          } else {
            throw error;
          }
        }
      }
    }

    response.json({ received: true });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth);

router.post("/checkout-session", async (request, response, next) => {
  const parsed = checkoutSchema.safeParse(request.body);
  const ip = getRequestIp(request);
  if (!parsed.success) {
    auditLog("stripe.checkout_session_invalid_payload", {
      ip,
      userId: request.auth?.user.id
    });
    response.status(400).json({ message: "Invalid checkout payload." });
    return;
  }

  const userId = request.auth!.user.id;

  try {
    const stripe = getStripeClient();

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true }
    });

    if (cartItems.length === 0) {
      throw new HttpError(400, "Your cart is empty.");
    }

    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        throw new HttpError(400, `${item.product.name} has insufficient stock.`);
      }
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const shipping = computeShipping(subtotal);
    const total = subtotal + shipping;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${env.clientOrigin}/checkout?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientOrigin}/checkout?stripe=cancelled`,
      customer_email: parsed.data.email,
      line_items: [
        ...cartItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.product.price * 100,
            product_data: {
              name: item.product.name,
              description: item.product.tagline,
              images: [item.product.heroImage]
            }
          }
        })),
        ...(shipping > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: shipping * 100,
                  product_data: {
                    name: "Shipping"
                  }
                }
              }
            ]
          : [])
      ],
      metadata: {
        userId
      }
    });

    const order = await prisma.$transaction((tx) =>
      createOrderWithRetry(tx, {
        user: {
          connect: { id: userId }
        },
        status: OrderStatus.PENDING_PAYMENT,
        stripeSessionId: session.id,
        subtotal,
        shipping,
        total,
        shippingFullName: parsed.data.fullName.trim(),
        shippingEmail: parsed.data.email.trim(),
        shippingAddress: parsed.data.address.trim(),
        shippingCity: parsed.data.city.trim(),
        shippingZip: parsed.data.zip.trim(),
        shippingCountry: parsed.data.country.trim(),
        lines: {
          create: cartItems.map((item) => ({
            product: {
              connect: { id: item.productId }
            },
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price
          }))
        }
      }),
    );

    response.status(201).json({
      sessionId: session.id,
      url: session.url,
      order: serializeOrder(order)
    });
    auditLog("stripe.checkout_session_created", {
      ip,
      userId,
      orderId: order.id,
      orderCode: order.orderCode,
      sessionId: session.id,
      total
    });
  } catch (error) {
    if (error instanceof HttpError) {
      auditLog("stripe.checkout_session_failed", {
        ip,
        userId,
        status: error.status,
        reason: error.message
      });
    }
    next(error);
  }
});

router.post("/confirm/:sessionId", async (request, response, next) => {
  try {
    const stripe = getStripeClient();
    const sessionParam = request.params.sessionId;
    const sessionId = Array.isArray(sessionParam) ? sessionParam[0] : sessionParam;
    const userId = request.auth!.user.id;

    const [session, existingOrder] = await Promise.all([
      stripe.checkout.sessions.retrieve(sessionId),
      prisma.order.findFirst({
        where: {
          stripeSessionId: sessionId,
          userId
        },
        include: {
          lines: true
        }
      })
    ]);

    if (!existingOrder) {
      throw new HttpError(404, "No order found for this Stripe session.");
    }

    if (session.payment_status !== "paid") {
      auditLog("stripe.confirm_not_paid", {
        userId,
        sessionId,
        paymentStatus: session.payment_status
      });
      response.json({ paid: false, order: serializeOrder(existingOrder) });
      return;
    }

    const order = await finalizeStripeOrder(sessionId, userId);
    const paid = order.status === OrderStatus.PLACED || order.status === OrderStatus.FULFILLED;

    auditLog("stripe.confirm_result", {
      userId,
      sessionId,
      orderId: order.id,
      orderCode: order.orderCode,
      status: order.status,
      paid
    });
    response.json({ paid, order: serializeOrder(order) });
  } catch (error) {
    next(error);
  }
});

export default router;
