import { ProductCategory } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { serializeProduct } from "../lib/serializers.js";

const router = Router();

router.get("/", async (request, response) => {
  const categoryRaw =
    typeof request.query.category === "string" ? request.query.category : undefined;
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";

  const category =
    categoryRaw && categoryRaw in ProductCategory ? (categoryRaw as ProductCategory) : undefined;

  const products = await prisma.product.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { tagline: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { id: "asc" },
  });

  response.json({ products: products.map(serializeProduct) });
});

router.get("/:slug", async (request, response) => {
  const product = await prisma.product.findUnique({
    where: { slug: request.params.slug },
  });

  if (!product) {
    response.status(404).json({ message: "Product not found." });
    return;
  }

  response.json({ product: serializeProduct(product) });
});

export default router;
