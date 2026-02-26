import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

function readToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export const requireAuth: RequestHandler = async (request, response, next) => {
  const token = readToken(request.headers.authorization);

  if (!token) {
    response.status(401).json({ message: "Missing authentication token." });
    return;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    response.status(401).json({ message: "Session expired. Please sign in again." });
    return;
  }

  request.auth = {
    user: session.user,
    session: {
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
    },
  };

  next();
};
