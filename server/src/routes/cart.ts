import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth);

const addSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99).optional(),
});

const updateSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

async function readCart(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    select: {
      productId: true,
      quantity: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return items;
}

router.get("/", async (request, response) => {
  const items = await readCart(request.auth!.user.id);
  response.json({ cart: items });
});

router.post("/", async (request, response) => {
  const parsed = addSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid cart payload." });
    return;
  }

  const quantity = parsed.data.quantity ?? 1;

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true },
  });

  if (!product) {
    response.status(404).json({ message: "Product not found." });
    return;
  }

  const userId = request.auth!.user.id;

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId: parsed.data.productId,
      },
    },
  });

  if (!existing) {
    await prisma.cartItem.create({
      data: {
        userId,
        productId: parsed.data.productId,
        quantity,
      },
    });
  } else {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity: Math.min(existing.quantity + quantity, 99),
      },
    });
  }

  const items = await readCart(userId);
  response.json({ cart: items });
});

router.patch("/:productId", async (request, response) => {
  const productId = Number(request.params.productId);
  if (!Number.isInteger(productId)) {
    response.status(400).json({ message: "Invalid product id." });
    return;
  }

  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid quantity payload." });
    return;
  }

  const userId = request.auth!.user.id;

  if (parsed.data.quantity <= 0) {
    await prisma.cartItem.deleteMany({
      where: {
        userId,
        productId,
      },
    });
  } else {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      response.status(404).json({ message: "Product not found." });
      return;
    }

    await prisma.cartItem.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      create: {
        userId,
        productId,
        quantity: parsed.data.quantity,
      },
      update: {
        quantity: parsed.data.quantity,
      },
    });
  }

  const items = await readCart(userId);
  response.json({ cart: items });
});

router.delete("/:productId", async (request, response) => {
  const productId = Number(request.params.productId);
  if (!Number.isInteger(productId)) {
    response.status(400).json({ message: "Invalid product id." });
    return;
  }

  const userId = request.auth!.user.id;

  await prisma.cartItem.deleteMany({
    where: {
      userId,
      productId,
    },
  });

  const items = await readCart(userId);
  response.json({ cart: items });
});

router.delete("/", async (request, response) => {
  await prisma.cartItem.deleteMany({
    where: {
      userId: request.auth!.user.id,
    },
  });

  response.json({ cart: [] });
});

export default router;
