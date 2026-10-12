import { JwtPayload } from "../config/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      storeId?: number;
    }
  }
}

export {};
