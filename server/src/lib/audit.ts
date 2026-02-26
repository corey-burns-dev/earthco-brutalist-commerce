import type { Request } from "express";

type AuditValue = string | number | boolean | null | undefined;

interface AuditPayload {
  [key: string]: AuditValue;
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0] ?? "unknown";
  }

  return request.ip ?? "unknown";
}

export function auditLog(event: string, payload: AuditPayload = {}) {
  console.info(
    JSON.stringify({
      type: "audit",
      event,
      at: new Date().toISOString(),
      ...payload,
    }),
  );
}
