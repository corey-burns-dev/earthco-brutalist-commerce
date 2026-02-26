import { randomBytes } from "node:crypto";
import { type Order, type OrderLine, Prisma } from "@prisma/client";
import { HttpError } from "./httpError.js";

const ORDER_CODE_MAX_ATTEMPTS = 5;

function createOrderCode() {
  return `EC-${randomBytes(8).toString("hex").toUpperCase()}`;
}

function isOrderCodeConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target) && target.includes("orderCode");
}

export function computeShipping(subtotal: number) {
  return subtotal > 250 || subtotal === 0 ? 0 : 12;
}

export async function createOrderWithRetry(
  tx: Prisma.TransactionClient,
  data: Omit<Prisma.OrderCreateInput, "orderCode">,
): Promise<Order & { lines: OrderLine[] }> {
  let lastError: unknown;

  for (let attempt = 0; attempt < ORDER_CODE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await tx.order.create({
        data: {
          orderCode: createOrderCode(),
          ...data,
        },
        include: {
          lines: true,
        },
      });
    } catch (error) {
      if (isOrderCodeConflict(error) && attempt < ORDER_CODE_MAX_ATTEMPTS - 1) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new HttpError(500, "Unable to generate a unique order code.");
}
