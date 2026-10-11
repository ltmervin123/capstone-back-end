import type { Role } from '../generated/prisma/index.js';
import type { UserPermissions } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        permissions?: UserPermissions | null;
      };
    }
  }
}

export {};
