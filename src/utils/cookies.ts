import type { CookieOptions, Response } from 'express';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../config/constants.js';
import { env, isProduction } from '../config/env.js';
import { parseDurationToMs } from './duration.js';

function isLocalFrontend(frontendUrl: string): boolean {
  try {
    const { hostname } = new URL(frontendUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

const crossSiteCookies = !isLocalFrontend(env.FRONTEND_URL);

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  path: '/',
  secure: crossSiteCookies || isProduction,
  sameSite: crossSiteCookies ? 'none' : 'lax',
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions,
    maxAge: parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions,
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions);
}
