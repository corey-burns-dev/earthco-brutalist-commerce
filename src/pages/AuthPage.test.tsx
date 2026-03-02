import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useStore } from "../context/StoreContext";
import AuthPage from "./AuthPage";

vi.mock("../context/StoreContext", () => ({
  useStore: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// PageShell just renders children
vi.mock("../components/PageShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const useStoreMock = vi.mocked(useStore);

describe("AuthPage", () => {
  const loginMock = vi.fn();
  const registerMock = vi.fn();

  beforeEach(() => {
    loginMock.mockReset();
    registerMock.mockReset();
    mockNavigate.mockReset();
    useStoreMock.mockReset();
    useStoreMock.mockReturnValue({
      login: loginMock,
      register: registerMock,
    } as unknown as ReturnType<typeof useStore>);
  });

  test("renders login form by default", () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  test("switches to register mode when Register chip is clicked", () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  test("calls login with email and password on submit", async () => {
    loginMock.mockResolvedValue({ ok: true, message: "Welcome back." });

    const { container } = render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "casey@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("casey@example.com", "secret");
    });
  });

  test("displays the message returned by login", async () => {
    loginMock.mockResolvedValue({ ok: false, message: "Invalid credentials." });

    const { container } = render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials.")).toBeInTheDocument();
    });
  });

  test("calls register with name, email, and password in register mode", async () => {
    registerMock.mockResolvedValue({
      ok: true,
      message: "Account created. You are now signed in.",
    });

    const { container } = render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>,
    );

    // Switch to register mode via the toggle chip
    fireEvent.click(screen.getAllByRole("button", { name: "Register" })[0]);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Sam" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "sam@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "pass123" },
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith("Sam", "sam@example.com", "pass123");
    });
  });
});
