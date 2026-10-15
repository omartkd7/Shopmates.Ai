import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../config/jwt";

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication token required" });
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}


