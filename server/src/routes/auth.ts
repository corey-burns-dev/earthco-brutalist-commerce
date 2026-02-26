import { Router } from "express";
import { z } from "zod";
import { auditLog, getRequestIp } from "../lib/audit.js";
import { createSessionToken, hashPassword, verifyPassword } from "../lib/auth.js";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { createRateLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(1),
});

const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: "Too many authentication attempts. Please try again shortly.",
});

function sessionExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + env.sessionDays);
  return date;
}

router.post("/register", authRateLimit, async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);
  const ip = getRequestIp(request);
  if (!parsed.success) {
    auditLog("auth.register_invalid_payload", { ip });
    response.status(400).json({ message: "Invalid registration payload." });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const isAdmin = env.adminEmails.includes(email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    auditLog("auth.register_conflict", { ip, email });
    response.status(409).json({ message: "An account with that email already exists." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const token = createSessionToken();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        passwordHash,
        isAdmin,
      },
      select: { id: true, name: true, email: true, isAdmin: true },
    });

    await tx.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: sessionExpiryDate(),
      },
    });

    return user;
  });

  auditLog("auth.register_success", { ip, email, userId: result.id, isAdmin: result.isAdmin });
  response.status(201).json({ user: result, token });
});

router.post("/login", authRateLimit, async (request, response) => {
  const parsed = credentialsSchema.safeParse(request.body);
  const ip = getRequestIp(request);
  if (!parsed.success) {
    auditLog("auth.login_invalid_payload", { ip });
    response.status(400).json({ message: "Invalid login payload." });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    auditLog("auth.login_failed", { ip, email });
    response.status(401).json({ message: "Invalid email/password combination." });
    return;
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValid) {
    auditLog("auth.login_failed", { ip, email, userId: user.id });
    response.status(401).json({ message: "Invalid email/password combination." });
    return;
  }

  const token = createSessionToken();

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: sessionExpiryDate(),
    },
  });

  auditLog("auth.login_success", { ip, email, userId: user.id, isAdmin: user.isAdmin });
  response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    token,
  });
});

router.post("/logout", requireAuth, async (request, response) => {
  await prisma.session.deleteMany({
    where: {
      token: request.auth!.session.token,
    },
  });

  auditLog("auth.logout", {
    ip: getRequestIp(request),
    userId: request.auth?.user.id,
  });
  response.json({ ok: true });
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.auth!.user });
});

export default router;
