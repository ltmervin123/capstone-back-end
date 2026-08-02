import type { User } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export async function findByUsernameOrEmail(identifier: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier }],
    },
  });
}

export async function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}
