import type { NextFunction, Request, Response } from 'express';
import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import type { UserPermissions } from '../types/auth.js';
import { permissionsFromJson } from '../types/auth.js';
import * as userRepository from '../repositories/user.repository.js';

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

export function requirePermission(permissionKey: keyof UserPermissions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
      return;
    }

    // Administrators always bypass permission checks
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    try {
      const user = await userRepository.findById(req.user.id);
      if (!user || !user.isActive) {
        next(new AppError(401, 'User account is inactive or not found', 'UNAUTHORIZED'));
        return;
      }

      const permissions = permissionsFromJson(user.permissions);
      if (!permissions || permissions[permissionKey] !== true) {
        next(new AppError(403, `Access denied: missing '${permissionKey}' permission`, 'FORBIDDEN'));
        return;
      }

      req.user.permissions = permissions;
      next();
    } catch (error) {
      next(error);
    }
  };
}
