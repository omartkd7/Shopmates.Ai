import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserRole } from "../models/User";

const JWT_SECRET: string =
  process.env.JWT_SECRET || "shopmate-super-secret-jwt-key-2026-local";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "15m";

// 7 days TTL in milliseconds
export const REFRESH_TOKEN_TTL_MS: number = 7 * 24 * 60 * 60 * 1000;

export interface JwtPayload {
  userId: number;
  storeId: number;
  role: UserRole;
  email: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
