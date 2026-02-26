import { Prisma, ProductCategory } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { auditLog, getRequestIp } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { serializeProduct } from "../lib/serializers.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const categorySchema = z.nativeEnum(ProductCategory);

const baseSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  tagline: z.string().min(2),
  description: z.string().min(10),
  price: z.number().int().positive(),
  category: categorySchema,
  accent: z.string().min(4),
  heroImage: z.string().url(),
  gallery: z.array(z.string().url()).min(1).max(6),
  stock: z.number().int().min(0),
  rating: z.number().min(0).max(5),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();

router.use(requireAuth, requireAdmin);

router.get("/products", async (_request, response) => {
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
  });

  response.json({ products: products.map(serializeProduct) });
});

router.post("/products", async (request, response) => {
  const actorId = request.auth?.user.id;
  const ip = getRequestIp(request);
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) {
    auditLog("admin.product_create_invalid_payload", { actorId, ip });
    response.status(400).json({ message: "Invalid product payload." });
    return;
  }

  const existingSlug = await prisma.product.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });

  if (existingSlug) {
    auditLog("admin.product_create_conflict", { actorId, ip, slug: parsed.data.slug });
    response.status(409).json({ message: "Slug already exists." });
    return;
  }

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
    },
  });

  auditLog("admin.product_created", { actorId, ip, productId: product.id, slug: product.slug });
  response.status(201).json({ product: serializeProduct(product) });
});

router.patch("/products/:id", async (request, response) => {
  const actorId = request.auth?.user.id;
  const ip = getRequestIp(request);
  const id = Number(request.params.id);
  if (!Number.isInteger(id)) {
    response.status(400).json({ message: "Invalid product id." });
    return;
  }

  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    auditLog("admin.product_update_invalid_payload", { actorId, ip, productId: id });
    response.status(400).json({ message: "Invalid product update payload." });
    return;
  }

  if (parsed.data.slug) {
    const existingSlug = await prisma.product.findFirst({
      where: {
        slug: parsed.data.slug,
        id: { not: id },
      },
      select: { id: true },
    });

    if (existingSlug) {
      auditLog("admin.product_update_conflict", {
        actorId,
        ip,
        productId: id,
        slug: parsed.data.slug,
      });
      response.status(409).json({ message: "Slug already exists." });
      return;
    }
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: parsed.data,
    });

    auditLog("admin.product_updated", { actorId, ip, productId: product.id, slug: product.slug });
    response.json({ product: serializeProduct(product) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      auditLog("admin.product_update_not_found", { actorId, ip, productId: id });
      response.status(404).json({ message: "Product not found." });
      return;
    }

    throw error;
  }
});

router.delete("/products/:id", async (request, response) => {
  const actorId = request.auth?.user.id;
  const ip = getRequestIp(request);
  const id = Number(request.params.id);
  if (!Number.isInteger(id)) {
    response.status(400).json({ message: "Invalid product id." });
    return;
  }

  const orderUsage = await prisma.orderLine.count({
    where: { productId: id },
  });

  if (orderUsage > 0) {
    auditLog("admin.product_delete_blocked_by_orders", { actorId, ip, productId: id });
    response.status(409).json({
      message: "Cannot delete a product that already appears in past orders.",
    });
    return;
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { slug: true },
    });

    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    auditLog("admin.product_deleted", { actorId, ip, productId: id, slug: existing?.slug });
    response.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      auditLog("admin.product_delete_not_found", { actorId, ip, productId: id });
      response.status(404).json({ message: "Product not found." });
      return;
    }

    throw error;
  }
});

export default router;
