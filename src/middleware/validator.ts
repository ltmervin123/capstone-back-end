import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/AppError.js';

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ');
      next(new AppError(400, message, 'VALIDATION_ERROR'));
      return;
    }

    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ');
      next(new AppError(400, message, 'VALIDATION_ERROR'));
      return;
    }

    req.params = result.data as Record<string, string>;
    next();
  };
}
