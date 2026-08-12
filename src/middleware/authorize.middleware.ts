import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';

export function requireRoles(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, 'Forbidden', 'FORBIDDEN'));
      return;
    }

    next();
  };
}
