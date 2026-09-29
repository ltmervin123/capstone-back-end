import type { NextFunction, Request, Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from '../config/constants.js';
import * as authService from '../services/auth.service.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';
import type { ChangePasswordInput, LoginInput } from '../validators/auth.validator.js';

function getSessionMeta(req: Request) {
  const userAgent = req.get('user-agent');
  const ipAddress = req.ip;

  return {
    ...(userAgent ? { userAgent } : {}),
    ...(ipAddress ? { ipAddress } : {}),
  };
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await authService.login(req.body as LoginInput, getSessionMeta(req));
    setAuthCookies(res, session.accessToken, session.refreshToken);

    res.status(200).json({
      success: true,
      data: { user: session.user },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await authService.logout(refreshToken);
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;

    if (!refreshToken) {
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        error: {
          message: 'Refresh token missing',
          code: 'INVALID_REFRESH_TOKEN',
        },
      });
      return;
    }

    const session = await authService.refreshSession(refreshToken, getSessionMeta(req));
    setAuthCookies(res, session.accessToken, session.refreshToken);

    res.status(200).json({
      success: true,
      data: { user: session.user },
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    const user = await authService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    await authService.changePassword(userId, req.body as ChangePasswordInput);

    res.status(200).json({
      success: true,
      data: { message: 'Password updated successfully' },
    });
  } catch (error) {
    next(error);
  }
}
