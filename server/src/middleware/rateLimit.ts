import type { Request, RequestHandler } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (request: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimit(options: RateLimitOptions): RequestHandler {
  const entries = new Map<string, RateLimitEntry>();
  const windowMs = Math.max(options.windowMs, 1000);
  const max = Math.max(options.max, 1);
  const message = options.message ?? "Too many requests. Please try again later.";

  function defaultKeyGenerator(request: Request) {
    return request.ip ?? "unknown";
  }

  return (request, response, next) => {
    const now = Date.now();
    const key = (options.keyGenerator ?? defaultKeyGenerator)(request);
    const existing = entries.get(key);

    if (!existing || existing.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      response.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)));
      response.status(429).json({ message });
      return;
    }

    next();
  };
}
