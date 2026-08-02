import jwt from 'jsonwebtoken';
import type { Role } from '../generated/prisma/index.js';
import { env } from '../config/env.js';
import { parseDurationToMs } from './duration.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: Math.floor(parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN) / 1000),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof decoded === 'string' || !decoded.sub || !decoded.role) {
    throw new jwt.JsonWebTokenError('Invalid access token payload');
  }

  return {
    sub: decoded.sub,
    role: decoded.role as Role,
  };
}
