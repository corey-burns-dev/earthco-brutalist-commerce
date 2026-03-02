import { describe, expect, test } from "vitest";
import { formatCurrency, formatDate } from "./format";

describe("formatCurrency", () => {
  test("formats a whole dollar amount", () => {
    expect(formatCurrency(90)).toBe("$90");
  });

  test("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  test("formats thousands with comma", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
  });

  test("rounds fractional cents (maximumFractionDigits: 0)", () => {
    expect(formatCurrency(49.99)).toBe("$50");
  });
});

describe("formatDate", () => {
  test("returns a non-empty string for a valid ISO date", () => {
    const result = formatDate("2024-06-15T12:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("includes the year in the output", () => {
    const result = formatDate("2024-06-15T12:00:00Z");
    expect(result).toContain("2024");
  });
});
