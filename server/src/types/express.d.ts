import type { AuthPayload } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}
