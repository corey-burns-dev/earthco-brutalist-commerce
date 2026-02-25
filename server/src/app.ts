import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import productRoutes from "./routes/products.js";
import stripeRoutes from "./routes/stripe.js";
import { env } from "./lib/env.js";
import { HttpError } from "./lib/httpError.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: false
    }),
  );
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "earthco-market-server" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/stripe", stripeRoutes);
  app.use("/api/admin", adminRoutes);

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      response.status(error.status).json({ message: error.message });
      return;
    }

    console.error(error);
    response.status(500).json({ message: "Unexpected server error." });
  });

  return app;
}
