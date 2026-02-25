import { Router } from "express";
import { z } from "zod";
import { auditLog, getRequestIp } from "../lib/audit.js";
import { HttpError } from "../lib/httpError.js";
import { computeShipping, createOrderWithRetry } from "../lib/orders.js";
import { prisma } from "../lib/prisma.js";
import { serializeOrder } from "../lib/serializers.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth);

const checkoutSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1)
});

router.get("/", async (request, response) => {
  const userId = request.auth!.user.id;
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      lines: true
    },
    orderBy: { createdAt: "desc" }
  });

  response.json({ orders: orders.map(serializeOrder) });
});

router.post("/checkout", async (request, response, next) => {
  const parsed = checkoutSchema.safeParse(request.body);
  const ip = getRequestIp(request);
  if (!parsed.success) {
    auditLog("order.checkout_invalid_payload", {
      ip,
      userId: request.auth?.user.id
    });
    response.status(400).json({ message: "Invalid checkout payload." });
    return;
  }

  const userId = request.auth!.user.id;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
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

      for (const item of cartItems) {
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: {
              gte: item.quantity
            }
          },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });

        if (stockUpdate.count === 0) {
          throw new HttpError(400, `${item.product.name} is out of stock.`);
        }
      }

      const createdOrder = await createOrderWithRetry(tx, {
        user: {
          connect: { id: userId }
        },
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
      });

      await tx.cartItem.deleteMany({
        where: { userId }
      });

      return createdOrder;
    });

    response.status(201).json({ order: serializeOrder(order) });
    auditLog("order.checkout_success", {
      ip,
      userId,
      orderId: order.id,
      orderCode: order.orderCode,
      total: order.total
    });
  } catch (error) {
    if (error instanceof HttpError) {
      auditLog("order.checkout_failed", {
        ip,
        userId,
        status: error.status,
        reason: error.message
      });
    }
    next(error);
  }
});

export default router;
