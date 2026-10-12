import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Malformed JSON payload
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }

  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Sequelize Unique Constraint error
  if (err.name === "SequelizeUniqueConstraintError") {
    res.status(409).json({ error: "Resource conflict: duplicate entry" });
    return;
  }

  // Sequelize Validation error
  if (err.name === "SequelizeValidationError") {
    res.status(400).json({ error: err.message || "Database validation failed" });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    res.status(401).json({ error: "Invalid or expired authentication token" });
    return;
  }

  // Explicit status code on error
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode < 500 ? err.message : "Internal server error";

  // Safe logging: log error message without sensitive user data
  console.error("Unhandled error:", err.message || err);

  res.status(statusCode).json({ error: message });
}
