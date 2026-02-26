import type { Order, OrderLine, Product, ProductCategory } from "@prisma/client";

function categoryToString(category: ProductCategory): string {
  return category;
}

export function serializeProduct(product: Product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    price: product.price,
    category: categoryToString(product.category),
    accent: product.accent,
    heroImage: product.heroImage,
    gallery: product.gallery,
    stock: product.stock,
    rating: product.rating,
  };
}

export function serializeOrder(order: Order & { lines: OrderLine[] }) {
  return {
    id: order.id,
    orderCode: order.orderCode,
    status: order.status,
    userId: order.userId,
    createdAt: order.createdAt.toISOString(),
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    lines: order.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
    shippingAddress: {
      fullName: order.shippingFullName,
      email: order.shippingEmail,
      address: order.shippingAddress,
      city: order.shippingCity,
      zip: order.shippingZip,
      country: order.shippingCountry,
    },
  };
}
