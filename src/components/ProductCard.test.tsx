import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useStore } from "../context/StoreContext";
import type { Product } from "../types/models";
import ProductCard from "./ProductCard";

vi.mock("../context/StoreContext", () => ({
  useStore: vi.fn(),
}));

const useStoreMock = vi.mocked(useStore);

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    Link: ({ children, to, ...props }: ComponentProps<"a"> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

const baseProduct: Product = {
  id: 1,
  slug: "trail-jacket",
  name: "Trail Jacket",
  tagline: "Built for the wild",
  description: "A great jacket",
  price: 200,
  category: "OUTERWEAR",
  accent: "#000000",
  heroImage: "https://example.com/jacket.jpg",
  gallery: [],
  stock: 10,
  rating: 4.7,
};

function renderCard(product = baseProduct, onAddToCart = vi.fn()) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} onAddToCart={onAddToCart} />
    </MemoryRouter>,
  );
}

describe("ProductCard", () => {
  beforeEach(() => {
    useStoreMock.mockReset();
    useStoreMock.mockReturnValue({ cart: [] } as unknown as ReturnType<typeof useStore>);
  });

  test("renders product name, tagline, and price", () => {
    renderCard();

    expect(screen.getByText("Trail Jacket")).toBeInTheDocument();
    expect(screen.getByText("Built for the wild")).toBeInTheDocument();
    expect(screen.getByText("$200")).toBeInTheDocument();
  });

  test("renders product image with alt text", () => {
    renderCard();

    const img = screen.getByRole("img", { name: "Trail Jacket" });
    expect(img).toHaveAttribute("src", "https://example.com/jacket.jpg");
  });

  test("shows 'Add to Cart' button by default", () => {
    renderCard();

    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeInTheDocument();
  });

  test("shows 'Not in cart yet.' status when cart is empty", () => {
    renderCard();

    expect(screen.getByText("Not in cart yet.")).toBeInTheDocument();
  });

  test("shows quantity in cart when item is in cart", () => {
    useStoreMock.mockReturnValue({
      cart: [{ productId: 1, quantity: 3 }],
    } as unknown as ReturnType<typeof useStore>);

    renderCard();

    expect(screen.getByText("In cart: 3.")).toBeInTheDocument();
  });

  test("calls onAddToCart with product id when button is clicked", () => {
    const onAddToCart = vi.fn().mockResolvedValue(undefined);
    renderCard(baseProduct, onAddToCart);

    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));

    expect(onAddToCart).toHaveBeenCalledWith(1);
  });

  test("Inspect link points to product slug route", () => {
    renderCard();

    const link = screen.getByRole("link", { name: "Inspect" });
    expect(link).toHaveAttribute("href", "/product/trail-jacket");
  });

  test("shows zero-padded product id tag", () => {
    renderCard();

    expect(screen.getByText("#001")).toBeInTheDocument();
  });
});
