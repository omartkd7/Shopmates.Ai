import { rateLimit } from "express-rate-limit";

const windowMs = 15 * 60 * 1000; // 15 minutes
const maxRequests = Number(process.env.RATE_LIMIT_MAX) || 100;

export const globalRateLimiter = rateLimit({
  windowMs,
  limit: maxRequests,
  statusCode: 429,
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    error: "Too many requests, please try again later.",
  },
});

// Helper for testing or custom strict route rate limits
export function createRateLimiter(options: {
  windowMs: number;
  limit: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: options.message || "Too many requests, please try again later.",
    },
  });
}

/**
 * AI Agent Rate Limiter: max 20 messages per minute per user (or IP if unauthenticated).
 * Enforces the ShopMate security rule: 20 agent msg/min/user.
 */
export const agentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).user?.userId
      ? `user_${(req as any).user.userId}`
      : req.ip || "unknown";
  },
  message: {
    error: "Trop de requêtes vers l'assistant IA (max 20 messages / minute).",
  },
});
