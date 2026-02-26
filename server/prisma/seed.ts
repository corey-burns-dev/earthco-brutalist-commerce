import { PrismaClient, ProductCategory } from "@prisma/client";
import { products as storefrontProducts } from "../../src/data/products";

const prisma = new PrismaClient();

const categoryMap: Record<string, ProductCategory> = {
  OUTERWEAR: ProductCategory.OUTERWEAR,
  FOOTWEAR: ProductCategory.FOOTWEAR,
  BAGS: ProductCategory.BAGS,
  ACCESSORIES: ProductCategory.ACCESSORIES,
  ESSENTIALS: ProductCategory.ESSENTIALS,
};

const products = storefrontProducts.map((product) => ({
  ...product,
  category: categoryMap[product.category],
}));

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
