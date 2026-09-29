import { Role, type Prisma, type User } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

type AuditInput = {
  userId: string;
  username: string;
  action: string;
  details: string;
  ipAddress?: string;
  entityId?: string;
};

function auditCreateData(audit: AuditInput): Prisma.AuditLogUncheckedCreateInput {
  return {
    userId: audit.userId,
    username: audit.username,
    action: audit.action,
    entityType: 'User',
    entityId: audit.entityId ?? null,
    details: audit.details,
    ipAddress: audit.ipAddress ?? null,
  };
}

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

export async function updatePasswordHash(id: string, passwordHash: string): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: { passwordHash },
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

export async function listUsers(): Promise<User[]> {
  return prisma.user.findMany({
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({
    where: {
      role: Role.ADMIN,
      isActive: true,
      isApproved: true,
    },
  });
}

export async function createStaffUser(params: {
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  permissions: Prisma.InputJsonValue;
  audit: AuditInput;
}): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username: params.username,
        email: params.email,
        passwordHash: params.passwordHash,
        role: params.role,
        isActive: true,
        isApproved: true,
        permissions: params.permissions,
      },
    });

    await tx.auditLog.create({
      data: auditCreateData({ ...params.audit, entityId: created.id }),
    });

    return created;
  });
}

export async function updateUserRecord(params: {
  id: string;
  data: Prisma.UserUpdateInput;
  audit: AuditInput;
}): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: params.id },
      data: params.data,
    });

    await tx.auditLog.create({
      data: auditCreateData({ ...params.audit, entityId: updated.id }),
    });

    return updated;
  });
}

export async function deleteUserRecord(params: {
  id: string;
  audit: AuditInput;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: auditCreateData({ ...params.audit, entityId: params.id }),
    });

    await tx.user.delete({
      where: { id: params.id },
    });
  });
}
