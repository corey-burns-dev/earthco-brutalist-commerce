import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma, ProductCategory } from "@prisma/client";
import express, { Router } from "express";
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

const allowedImageTypes = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);

function sanitizeStem(value: string) {
  const stem = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || "product-image";
}

router.use(requireAuth, requireAdmin);

router.get("/products", async (_request, response) => {
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
  });

  response.json({ products: products.map(serializeProduct) });
});

router.post(
  "/uploads/image",
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
    limit: "8mb",
  }),
  async (request, response) => {
    const actorId = request.auth?.user.id;
    const ip = getRequestIp(request);
    const contentType = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
    const extension = contentType ? allowedImageTypes.get(contentType) : undefined;

    if (!extension) {
      auditLog("admin.image_upload_invalid_type", { actorId, ip, contentType });
      response
        .status(400)
        .json({ message: "Invalid image type. Use JPG, PNG, WEBP, GIF, or AVIF." });
      return;
    }

    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      auditLog("admin.image_upload_empty", { actorId, ip });
      response.status(400).json({ message: "Image upload body is empty." });
      return;
    }

    const requestedName =
      typeof request.query.name === "string" ? request.query.name : `upload-${Date.now()}`;
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeStem(requestedName)}.${extension}`;
    const uploadsDir = path.resolve(process.cwd(), "uploads", "products");
    const filePath = path.join(uploadsDir, fileName);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(filePath, request.body);

    const forwardedProto = request.headers["x-forwarded-proto"];
    const protocol =
      typeof forwardedProto === "string" ? forwardedProto.split(",")[0].trim() : request.protocol;
    const host = request.get("host");
    const publicUrl = `${protocol}://${host}/api/uploads/products/${fileName}`;

    auditLog("admin.image_uploaded", { actorId, ip, fileName });
    response.status(201).json({ url: publicUrl });
  },
);

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
