const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "passwd",
  "passphrase",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "apikey",
  "secret",
  "jwtsecret",
  "seedadminpassword",
  "privatekey",
]);

export function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return data
      .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer [REDACTED]")
      .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_API_KEY]")
      .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]")
      .replace(/\b[a-f0-9]{64,}\b/gi, "[REDACTED_OPAQUE_TOKEN]")
      .replace(/((?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|passwd|secret|authorization)(?:\s+is\s+|\s*[:=]\s*))("[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1[REDACTED]");
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isTokenMetric = ["tokenusage", "prompttokens", "completiontokens", "totaltokens"].includes(normalizedKey);
      const isSensitiveKey = SENSITIVE_KEYS.has(normalizedKey) ||
        /password|passwd|passphrase|token|secret|apikey|authorization|cookie|privatekey/.test(normalizedKey);
      if (isSensitiveKey && !isTokenMetric) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }

    return sanitized;
  }

  return data;
}
