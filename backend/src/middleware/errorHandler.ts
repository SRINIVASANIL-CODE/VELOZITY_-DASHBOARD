import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { ZodError } from "zod";

// Single place that shapes every error response. No stack traces, no raw Prisma/DB
// error text ever reaches the client — only a stable { error: { message, code } } shape.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { message: err.message, code: err.code ?? "ERROR" } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }
  console.error(err); // server-side only
  return res.status(500).json({ error: { message: "Internal server error", code: "INTERNAL" } });
}
