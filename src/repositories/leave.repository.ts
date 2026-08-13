import type { LeaveStatus, LeaveType, Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export type LeaveWithEmployee = Prisma.LeaveRecordGetPayload<{
  include: {
    employee: {
      select: {
        employeeNumber: true;
        firstName: true;
        surname: true;
        position: true;
        department: { select: { name: true } };
      };
    };
  };
}>;

const leaveInclude = {
  employee: {
    select: {
      employeeNumber: true,
      firstName: true,
      surname: true,
      position: true,
      department: { select: { name: true } },
    },
  },
} satisfies Prisma.LeaveRecordInclude;

export async function listLeaves(): Promise<LeaveWithEmployee[]> {
  return prisma.leaveRecord.findMany({
    include: leaveInclude,
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function listLeavesByEmployeeId(employeeId: string): Promise<LeaveWithEmployee[]> {
  return prisma.leaveRecord.findMany({
    where: { employeeId },
    include: leaveInclude,
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function listEmployeeLeavesInYear(employeeId: string, year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  return prisma.leaveRecord.findMany({
    where: {
      employeeId,
      leaveType: 'LEAVE_CREDITS' as LeaveType,
      startDate: { gte: start, lt: end },
    },
    select: {
      numberOfDays: true,
      status: true,
    },
  });
}

export async function findById(id: string): Promise<LeaveWithEmployee | null> {
  return prisma.leaveRecord.findUnique({
    where: { id },
    include: leaveInclude,
  });
}

export async function createLeave(params: {
  record: {
    employeeId: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    numberOfDays: number;
    timeFrom: string | null;
    timeTo: string | null;
    reason: string;
    status: LeaveStatus;
    createdById: string;
  };
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<LeaveWithEmployee> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.leaveRecord.create({
      data: params.record,
      include: leaveInclude,
    });

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'LeaveRecord',
      entityId: created.id,
      details: params.audit.details,
      ipAddress: params.audit.ipAddress ?? null,
    };

    await tx.auditLog.create({
      data: auditData,
    });

    return created;
  });
}

export async function deleteLeave(params: {
  id: string;
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'LeaveRecord',
      entityId: params.id,
      details: params.audit.details,
      ipAddress: params.audit.ipAddress ?? null,
    };

    await tx.auditLog.create({
      data: auditData,
    });

    await tx.leaveRecord.delete({
      where: { id: params.id },
    });
  });
}
