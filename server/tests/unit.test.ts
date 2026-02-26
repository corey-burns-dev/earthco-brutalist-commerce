import { describe, expect, test } from "bun:test";
import { computeShipping } from "../src/lib/orders.js";

describe("computeShipping", () => {
  test("free shipping on zero subtotal", () => {
    expect(computeShipping(0)).toBe(0);
  });

  test("$12 shipping on subtotals from 1 to 250", () => {
    expect(computeShipping(1)).toBe(12);
    expect(computeShipping(100)).toBe(12);
    expect(computeShipping(250)).toBe(12);
  });

  test("free shipping when subtotal exceeds $250", () => {
    expect(computeShipping(251)).toBe(0);
    expect(computeShipping(500)).toBe(0);
    expect(computeShipping(1000)).toBe(0);
  });
});
