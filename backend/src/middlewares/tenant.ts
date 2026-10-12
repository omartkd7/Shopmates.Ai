import { Request, Response, NextFunction } from "express";

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
