import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useStore } from "../context/StoreContext";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result =
      mode === "register" ? await register(name, email, password) : await login(email, password);

    setMessage(result.message);

    if (result.ok) {
      const next = searchParams.get("next") ?? "/account";
      setTimeout(() => {
        navigate(next);
      }, 500);
    }
  }

  return (
    <PageShell>
      <section className="auth-shell brutal-block">
        <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>
        <p>Account auth backed by Postgres sessions and Prisma models.</p>

        <div className="auth-toggle">
          <button
            type="button"
            className={mode === "login" ? "chip chip-active" : "chip"}
            onClick={() => {
              setMode("login");
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "chip chip-active" : "chip"}
            onClick={() => {
              setMode("register");
            }}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                className="text-input"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
                required
              />
            </>
          ) : null}

          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="text-input"
            value={email}
            type="email"
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            required
          />

          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            className="text-input"
            value={password}
            type="password"
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            required
          />

          <button type="submit" className="btn btn-dark">
            {mode === "login" ? "Login" : "Register"}
          </button>

          {message ? <p className="form-message">{message}</p> : null}
        </form>
      </section>
    </PageShell>
  );
}
