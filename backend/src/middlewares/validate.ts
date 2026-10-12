import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

export function validate(
  schema: ZodTypeAny,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parseResult = schema.safeParse(req[source]);

    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    // Replace with typed, sanitized data
    // Express 5 makes req.query and req.params getter-only properties on the prototype
    if (source === "body") {
      req.body = parseResult.data;
    } else {
      Object.defineProperty(req, source, {
        value: parseResult.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    next();
  };
}
