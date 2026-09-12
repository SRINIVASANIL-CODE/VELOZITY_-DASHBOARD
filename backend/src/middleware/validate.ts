import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

// Server-side validation gate. Every mutating route runs its body/query through a
// zod schema before the controller sees it — frontend validation is treated as UX only.
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as typeof req.query;
    next();
  };
}
