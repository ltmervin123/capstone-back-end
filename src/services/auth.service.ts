import type { User } from '../generated/prisma/index.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import * as refreshTokenRepository from '../repositories/refreshToken.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import type { AuthUser } from '../types/auth.js';
import { permissionsFromJson } from '../types/auth.js';
import {
  comparePassword,
  generateRefreshToken,
  hashToken,
} from '../utils/crypto.js';
import { parseDurationToDate } from '../utils/duration.js';
import { signAccessToken } from '../utils/jwt.js';
import type { LoginInput } from '../validators/auth.validator.js';

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isApproved: user.isApproved,
    permissions: permissionsFromJson(user.permissions),
    employeeId: user.employeeId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function createSession(user: User, meta: SessionMeta = {}): Promise<AuthSession> {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  await refreshTokenRepository.createRefreshToken({
    tokenHash,
    userId: user.id,
    expiresAt: parseDurationToDate(env.JWT_REFRESH_EXPIRES_IN),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
  });

  return {
    accessToken,
    refreshToken,
    user: toAuthUser(user),
  };
}

function validateUserForLogin(user: User | null): User {
  if (!user) {
    throw new AppError(401, 'Invalid username or password', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError(403, 'Your account is deactivated. Contact Admin.', 'ACCOUNT_DEACTIVATED');
  }

  if (!user.isApproved) {
    throw new AppError(403, 'Your account is pending approval.', 'ACCOUNT_PENDING');
  }

  return user;
}

export async function login(input: LoginInput, meta: SessionMeta = {}): Promise<AuthSession> {
  const user = await userRepository.findByUsernameOrEmail(input.username);
  const validUser = validateUserForLogin(user);

  const passwordMatches = await comparePassword(input.password, validUser.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'Invalid username or password', 'INVALID_CREDENTIALS');
  }

  return createSession(validUser, meta);
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (!user.isActive) {
    throw new AppError(403, 'Your account is deactivated. Contact Admin.', 'ACCOUNT_DEACTIVATED');
  }

  if (!user.isApproved) {
    throw new AppError(403, 'Your account is pending approval.', 'ACCOUNT_PENDING');
  }

  return toAuthUser(user);
}

export async function refreshSession(
  refreshToken: string,
  meta: SessionMeta = {},
): Promise<AuthSession> {
  const tokenHash = hashToken(refreshToken);
  const storedToken = await refreshTokenRepository.findValidRefreshToken(tokenHash);

  if (!storedToken) {
    throw new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const user = await userRepository.findById(storedToken.userId);
  const validUser = validateUserForLogin(user);

  await refreshTokenRepository.revokeRefreshToken(storedToken.id);

  return createSession(validUser, meta);
}

export async function logout(refreshToken?: string): Promise<void> {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await refreshTokenRepository.findValidRefreshToken(tokenHash);

  if (storedToken) {
    await refreshTokenRepository.revokeRefreshToken(storedToken.id);
  }
}

export { toAuthUser };
