import type { AttendanceStatus, Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export type AttendanceWithEmployee = Prisma.AttendanceRecordGetPayload<{
  include: {
    employee: { select: { employeeNumber: true; firstName: true; surname: true } };
  };
}>;

const attendanceInclude = {
  employee: { select: { employeeNumber: true, firstName: true, surname: true } },
} satisfies Prisma.AttendanceRecordInclude;

export async function listAttendance(): Promise<AttendanceWithEmployee[]> {
  return prisma.attendanceRecord.findMany({
    include: attendanceInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function listAttendanceByEmployeeId(employeeId: string): Promise<AttendanceWithEmployee[]> {
  return prisma.attendanceRecord.findMany({
    where: { employeeId },
    include: attendanceInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findByEmployeeIdAndDate(employeeId: string, date: Date) {
  return prisma.attendanceRecord.findUnique({
    where: {
      employeeId_date: { employeeId, date },
    },
  });
}

export async function createAttendance(params: {
  record: {
    employeeId: string;
    date: Date;
    timeIn: string | null;
    timeOut: string | null;
    status: AttendanceStatus;
    remarks: string | null;
    recordedById: string;
  };
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}): Promise<AttendanceWithEmployee> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.attendanceRecord.create({
      data: params.record,
      include: attendanceInclude,
    });

    const auditData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.audit.userId,
      username: params.audit.username,
      action: params.audit.action,
      entityType: 'AttendanceRecord',
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
