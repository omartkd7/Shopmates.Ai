import jwt from "jsonwebtoken";
import { UserRole } from "../models/User";

const JWT_SECRET: string =
  process.env.JWT_SECRET || "shopmate-super-secret-jwt-key-2026-local";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "15m";

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
