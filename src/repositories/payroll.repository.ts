import {
  PayrollRecordStatus,
  PayrollRunStatus,
  type Prisma,
} from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export const payrollRecordInclude = {
  employee: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      surname: true,
      position: true,
      department: { select: { id: true, name: true } },
    },
  },
  payrollRun: {
    select: {
      id: true,
      name: true,
      cutoffType: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  },
} satisfies Prisma.PayrollRecordInclude;

export const payrollRunInclude = {
  processedBy: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
  _count: {
    select: {
      payrollRecords: true,
    },
  },
} satisfies Prisma.PayrollRunInclude;

export async function listPayrollRuns() {
  return prisma.payrollRun.findMany({
    include: payrollRunInclude,
    orderBy: { startDate: 'desc' },
  });
}

export async function findPayrollRunById(id: string) {
  return prisma.payrollRun.findUnique({
    where: { id },
    include: {
      ...payrollRunInclude,
      payrollRecords: {
        include: payrollRecordInclude,
        orderBy: { employee: { surname: 'asc' } },
      },
    },
  });
}

export async function findConflictingLockedRun(date: Date, excludeRunId?: string) {
  return prisma.payrollRun.findFirst({
    where: {
      ...(excludeRunId ? { id: { not: excludeRunId } } : {}),
      status: { in: [PayrollRunStatus.ATTENDANCE_LOCKED, PayrollRunStatus.CALCULATED, PayrollRunStatus.PUBLISHED] },
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });
}

export async function createPayrollRun(params: {
  data: Prisma.PayrollRunCreateInput;
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.create({
      data: params.data,
      include: payrollRunInclude,
    });

    await tx.auditLog.create({
      data: {
        userId: params.audit.userId,
        username: params.audit.username,
        action: params.audit.action,
        entityType: 'PayrollRun',
        entityId: run.id,
        details: params.audit.details,
        ipAddress: params.audit.ipAddress ?? null,
      },
    });

    return run;
  });
}

export async function updatePayrollRunStatus(params: {
  id: string;
  status: PayrollRunStatus;
  publishedAt?: Date | null;
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payrollRun.update({
      where: { id: params.id },
      data: {
        status: params.status,
        ...(params.publishedAt !== undefined ? { publishedAt: params.publishedAt } : {}),
      },
      include: payrollRunInclude,
    });

    if (params.status === PayrollRunStatus.PUBLISHED) {
      await tx.payrollRecord.updateMany({
        where: { payrollRunId: params.id },
        data: { status: PayrollRecordStatus.PUBLISHED },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: params.audit.userId,
        username: params.audit.username,
        action: params.audit.action,
        entityType: 'PayrollRun',
        entityId: params.id,
        details: params.audit.details,
        ipAddress: params.audit.ipAddress ?? null,
      },
    });

    return updated;
  });
}

export async function deletePayrollRun(params: {
  id: string;
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}) {
  return prisma.$transaction(async (tx) => {
    await tx.payrollRecord.deleteMany({
      where: { payrollRunId: params.id },
    });

    const deleted = await tx.payrollRun.delete({
      where: { id: params.id },
    });

    await tx.auditLog.create({
      data: {
        userId: params.audit.userId,
        username: params.audit.username,
        action: params.audit.action,
        entityType: 'PayrollRun',
        entityId: params.id,
        details: params.audit.details,
        ipAddress: params.audit.ipAddress ?? null,
      },
    });

    return deleted;
  });
}

export async function saveBatchCalculatedRecords(params: {
  payrollRunId: string;
  records: Array<Prisma.PayrollRecordCreateManyInput>;
  totals: {
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
  };
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}) {
  return prisma.$transaction(async (tx) => {
    // Clear previously calculated records for this run if re-running
    await tx.payrollRecord.deleteMany({
      where: { payrollRunId: params.payrollRunId },
    });

    if (params.records.length > 0) {
      await tx.payrollRecord.createMany({
        data: params.records,
      });
    }

    const updatedRun = await tx.payrollRun.update({
      where: { id: params.payrollRunId },
      data: {
        status: PayrollRunStatus.CALCULATED,
        totalGross: params.totals.totalGross,
        totalDeductions: params.totals.totalDeductions,
        totalNet: params.totals.totalNet,
      },
      include: {
        ...payrollRunInclude,
        payrollRecords: {
          include: payrollRecordInclude,
          orderBy: { employee: { surname: 'asc' } },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.audit.userId,
        username: params.audit.username,
        action: params.audit.action,
        entityType: 'PayrollRun',
        entityId: params.payrollRunId,
        details: params.audit.details,
        ipAddress: params.audit.ipAddress ?? null,
      },
    });

    return updatedRun;
  });
}

export async function listPayrollRecords(params?: {
  payrollRunId?: string | undefined;
  employeeId?: string | undefined;
  month?: string | undefined;
  year?: number | undefined;
  status?: PayrollRecordStatus | undefined;
}) {
  return prisma.payrollRecord.findMany({
    where: {
      ...(params?.payrollRunId ? { payrollRunId: params.payrollRunId } : {}),
      ...(params?.employeeId ? { employeeId: params.employeeId } : {}),
      ...(params?.month ? { month: params.month } : {}),
      ...(params?.year ? { year: params.year } : {}),
      ...(params?.status ? { status: params.status } : {}),
    },
    include: payrollRecordInclude,
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findPayrollRecordById(id: string) {
  return prisma.payrollRecord.findUnique({
    where: { id },
    include: payrollRecordInclude,
  });
}

export async function updatePayrollRecord(params: {
  id: string;
  data: Prisma.PayrollRecordUpdateInput;
  audit: {
    userId: string;
    username: string;
    action: string;
    details: string;
    ipAddress?: string;
  };
}) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payrollRecord.update({
      where: { id: params.id },
      data: params.data,
      include: payrollRecordInclude,
    });

    // If belongs to a run, re-aggregate the run's totals
    if (updated.payrollRunId) {
      const records = await tx.payrollRecord.findMany({
        where: { payrollRunId: updated.payrollRunId },
        select: { grossPay: true, totalDeductions: true, netPay: true },
      });

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      for (const r of records) {
        totalGross += Number(r.grossPay);
        totalDeductions += Number(r.totalDeductions);
        totalNet += Number(r.netPay);
      }

      await tx.payrollRun.update({
        where: { id: updated.payrollRunId },
        data: { totalGross, totalDeductions, totalNet },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: params.audit.userId,
        username: params.audit.username,
        action: params.audit.action,
        entityType: 'PayrollRecord',
        entityId: params.id,
        details: params.audit.details,
        ipAddress: params.audit.ipAddress ?? null,
      },
    });

    return updated;
  });
}
