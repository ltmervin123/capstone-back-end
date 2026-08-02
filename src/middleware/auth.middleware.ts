import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_COOKIE } from '../config/constants.js';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;

  if (!token) {
    next(new AppError(401, 'Unauthorized', 'UNAUTHORIZED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Access token expired', 'TOKEN_EXPIRED'));
      return;
    }

    next(new AppError(401, 'Invalid access token', 'UNAUTHORIZED'));
  }
}
