import { Role, type Prisma, type User } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export async function findByUsernameOrEmail(identifier: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: identifier, mode: 'insensitive' } },
        { email: { equals: identifier, mode: 'insensitive' } },
      ],
    },
  });
}

export async function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function findByEmployeeId(employeeId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { employeeId },
  });
}

export async function listConflictingLogins(params: {
  emails: string[];
  usernames: string[];
  employeeIds: string[];
}): Promise<User[]> {
  const emails = params.emails.filter(Boolean);
  const usernames = params.usernames.filter(Boolean);
  const employeeIds = params.employeeIds.filter(Boolean);

  if (emails.length === 0 && usernames.length === 0 && employeeIds.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      OR: [
        ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
        ...(usernames.length > 0 ? [{ username: { in: usernames } }] : []),
        ...(employeeIds.length > 0 ? [{ employeeId: { in: employeeIds } }] : []),
      ],
    },
  });
}

export async function createEmployeeLogin(params: {
  username: string;
  email: string;
  passwordHash: string;
  employeeId: string;
  permissions: Prisma.InputJsonValue;
}): Promise<User> {
  return prisma.user.create({
    data: {
      username: params.username,
      email: params.email,
      passwordHash: params.passwordHash,
      role: Role.EMPLOYEE,
      isActive: true,
      isApproved: true,
      permissions: params.permissions,
      employeeId: params.employeeId,
    },
  });
}
