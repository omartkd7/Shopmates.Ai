import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../config/jwt";
import { Store } from "../models";
import { DEMO_STORE_NAME } from "../config/demo";

export function injectTenant(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || typeof req.user.storeId !== "number") {
    res.status(401).json({ error: "User authentication required for tenant access" });
    return;
  }

  // Inject storeId server-side strictly from the verified JWT token
  req.storeId = req.user.storeId;

  // Enforce rule: client-sent storeId is ignored and overwritten
  if (req.body && typeof req.body === "object") {
    req.body.storeId = req.storeId;
  }

  if (req.query && typeof req.query === "object") {
    delete (req.query as Record<string, unknown>).storeId;
  }

  next();
}

/**
 * Resolves the tenant storeId for public or semi-public store catalog endpoints:
 * 1. If valid JWT provided: scopes strictly to user's storeId from token
 * 2. If unauthenticated: defaults safely to DEMO_STORE_NAME
 * Never accepts client-sent storeId.
 */
export async function resolveStoreTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Strip any client-sent storeId in query or body immediately
  if (req.body && typeof req.body === "object") {
    delete (req.body as Record<string, unknown>).storeId;
  }
  if (req.query && typeof req.query === "object") {
    delete (req.query as Record<string, unknown>).storeId;
  }

  // 1. If user already authenticated
  if (req.user && typeof req.user.storeId === "number") {
    req.storeId = req.user.storeId;
    return next();
  }

  // 2. Check if Authorization header is present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7).trim();
      const payload = verifyAccessToken(token);
      req.user = payload;
      req.storeId = payload.storeId;
      return next();
    } catch {
      // If token is explicitly malformed/expired, reject with 401
      res.status(401).json({ error: "Invalid or expired authentication token" });
      return;
    }
  }

  // 3. Fallback to default demo store for public catalog browsing
  try {
    const demoStore = await Store.findOne({ where: { name: DEMO_STORE_NAME } });
    if (!demoStore) {
      res.status(404).json({ error: "Demo store is not initialized" });
      return;
    }

    req.storeId = demoStore.id;
    next();
  } catch (err) {
    next(err);
  }
}
