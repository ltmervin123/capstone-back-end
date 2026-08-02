import type { RefreshToken } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

interface CreateRefreshTokenInput {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export async function createRefreshToken(data: CreateRefreshTokenInput): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data });
}

export async function findValidRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
  return prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function revokeRefreshToken(id: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}
