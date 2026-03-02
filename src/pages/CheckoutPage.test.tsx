import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useStore } from "../context/StoreContext";
import CheckoutPage from "./CheckoutPage";

vi.mock("../context/StoreContext", () => ({
  useStore: vi.fn(),
}));

vi.mock("../utils/api", () => ({
  confirmStripeCheckout: vi.fn(),
  createStripeCheckoutSession: vi.fn(),
}));

vi.mock("../components/PageShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

const useStoreMock = vi.mocked(useStore);

const cartLine = {
  product: {
    id: 3,
    slug: "summit-boot",
    name: "Summit Boot",
    tagline: "Grip and go",
    description: "A boot",
    price: 180,
    category: "FOOTWEAR" as const,
    accent: "#222222",
    heroImage: "https://example.com/boot.jpg",
    gallery: [],
    stock: 5,
    rating: 4.6,
  },
  quantity: 1,
  lineTotal: 180,
};

describe("CheckoutPage", () => {
  beforeEach(() => {
    useStoreMock.mockReset();
    mockNavigate.mockReset();
  });

  test("shows sign-in required when there is no current user", () => {
    useStoreMock.mockReturnValue({
      currentUser: null,
      authToken: null,
      cartLines: [],
      cartSubtotal: 0,
      shippingCost: 0,
      cartTotal: 0,
      placeOrder: vi.fn(),
      refreshUserData: vi.fn(),
    } as unknown as ReturnType<typeof useStore>);

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in required for checkout.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Login/Register" })).toBeInTheDocument();
  });

  test("shows empty cart state when user is logged in but cart is empty", () => {
    useStoreMock.mockReturnValue({
      currentUser: { id: "u1", name: "Casey", email: "casey@example.com", isAdmin: false },
      authToken: "tok",
      cartLines: [],
      cartSubtotal: 0,
      shippingCost: 0,
      cartTotal: 0,
      placeOrder: vi.fn(),
      refreshUserData: vi.fn(),
    } as unknown as ReturnType<typeof useStore>);

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to Shop" })).toBeInTheDocument();
  });

  test("renders checkout form and order summary when user has items", () => {
    useStoreMock.mockReturnValue({
      currentUser: { id: "u1", name: "Casey", email: "casey@example.com", isAdmin: false },
      authToken: "tok",
      cartLines: [cartLine],
      cartSubtotal: 180,
      shippingCost: 12,
      cartTotal: 192,
      placeOrder: vi.fn(),
      refreshUserData: vi.fn(),
    } as unknown as ReturnType<typeof useStore>);

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByText("Summit Boot x 1")).toBeInTheDocument();
    expect(screen.getByText("$192")).toBeInTheDocument();
  });

  test("calls placeOrder and shows message on direct checkout submit", async () => {
    const placeOrder = vi
      .fn()
      .mockResolvedValue({ ok: true, message: "Order placed successfully.", orderId: "ORD-1" });

    useStoreMock.mockReturnValue({
      currentUser: { id: "u1", name: "Casey", email: "casey@example.com", isAdmin: false },
      authToken: "tok",
      cartLines: [cartLine],
      cartSubtotal: 180,
      shippingCost: 12,
      cartTotal: 192,
      placeOrder,
      refreshUserData: vi.fn(),
    } as unknown as ReturnType<typeof useStore>);

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Casey Jones" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "casey@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Portland" } });
    fireEvent.change(screen.getByLabelText("ZIP"), { target: { value: "97201" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "US" } });

    fireEvent.click(screen.getByRole("button", { name: "Place Order Directly" }));

    await waitFor(() => {
      expect(placeOrder).toHaveBeenCalledWith({
        fullName: "Casey Jones",
        email: "casey@example.com",
        address: "1 Main St",
        city: "Portland",
        zip: "97201",
        country: "US",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Order placed successfully.")).toBeInTheDocument();
    });
  });

  test("shows free shipping when subtotal exceeds $250", () => {
    useStoreMock.mockReturnValue({
      currentUser: { id: "u1", name: "Casey", email: "casey@example.com", isAdmin: false },
      authToken: "tok",
      cartLines: [{ ...cartLine, lineTotal: 300, quantity: 2 }],
      cartSubtotal: 300,
      shippingCost: 0,
      cartTotal: 300,
      placeOrder: vi.fn(),
      refreshUserData: vi.fn(),
    } as unknown as ReturnType<typeof useStore>);

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Free")).toBeInTheDocument();
  });
});
