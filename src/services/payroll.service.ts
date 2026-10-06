import {
  CutoffType,
  EmployeeStatus,
  LeaveStatus,
  PayrollRecordStatus,
  PayrollRunStatus,
  Role,
} from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';
import * as payrollRepository from '../repositories/payroll.repository.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import {
  calculateStatutoryAndTaxes,
  calculateTardiness,
} from '../utils/philippineTaxCalculator.js';
import type {
  AdjustPayrollRecordInput,
  CreatePayrollRunInput,
} from '../validators/payroll.validator.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function requirePayrollAccess(actor: { role: Role; permissions?: unknown }) {
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.HR) {
    const perms = actor.permissions as { payroll?: boolean } | null;
    if (perms?.payroll === false) {
      throw new AppError(403, 'User lacks payroll management permission', 'FORBIDDEN');
    }
    return;
  }
  throw new AppError(403, 'Forbidden', 'FORBIDDEN');
}

function parseLateMinutes(timeIn: string | null | undefined): number {
  if (!timeIn) return 0;
  const match = timeIn.match(/^(\d{1,2}):(\d{2})/);
  if (!match || !match[1] || !match[2]) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const totalMinutes = hours * 60 + minutes;
  const standardStartMinutes = 8 * 60; // 08:00 AM
  return Math.max(0, totalMinutes - standardStartMinutes);
}

function toFrontendRecord(
  record: Awaited<ReturnType<typeof payrollRepository.findPayrollRecordById>>
) {
  if (!record) return null;
  return {
    id: record.id,
    payrollRunId: record.payrollRunId,
    payrollRunName: record.payrollRun?.name ?? '',
    employeeId: record.employee.employeeNumber,
    employeeDbId: record.employee.id,
    employeeName: `${record.employee.firstName} ${record.employee.surname}`,
    position: record.employee.position,
    department: record.employee.department?.name ?? '',
    month: record.month,
    year: record.year,
    startDate: record.startDate ? record.startDate.toISOString().slice(0, 10) : null,
    endDate: record.endDate ? record.endDate.toISOString().slice(0, 10) : null,
    status: record.status,
    functionalRate: Number(record.functionalRate),
    daysWorked: record.daysWorked,
    basicSalary: Number(record.basicSalary),
    allowances: Number(record.allowances),
    gasoline: Number(record.gasoline),
    grossPay: Number(record.grossPay),
    tardinessMinutes: record.tardinessMinutes,
    tardinessDeduction: Number(record.tardinessDeduction),
    sssDeduction: Number(record.sssDeduction),
    philHealthDeduction: Number(record.philHealthDeduction),
    pagIbigDeduction: Number(record.pagIbigDeduction),
    taxWithheld: Number(record.taxWithheld),
    cashAdvance: Number(record.cashAdvance),
    employeeShare: Number(record.employeeShare),
    otherDeductions: Number(record.otherDeductions),
    totalDeductions: Number(record.totalDeductions),
    netPay: Number(record.netPay),
    createdAt: record.createdAt.toISOString(),
  };
}

function toFrontendRun(
  run: Awaited<ReturnType<typeof payrollRepository.listPayrollRuns>>[number]
) {
  return {
    id: run.id,
    name: run.name,
    cutoffType: run.cutoffType,
    startDate: run.startDate.toISOString().slice(0, 10),
    endDate: run.endDate.toISOString().slice(0, 10),
    status: run.status,
    totalGross: Number(run.totalGross),
    totalDeductions: Number(run.totalDeductions),
    totalNet: Number(run.totalNet),
    recordCount: '_count' in run ? run._count.payrollRecords : 0,
    processedBy: run.processedBy?.username ?? 'System',
    publishedAt: run.publishedAt ? run.publishedAt.toISOString() : null,
    createdAt: run.createdAt.toISOString(),
  };
}

export async function listPayrollRuns(actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const runs = await payrollRepository.listPayrollRuns();
  return runs.map(toFrontendRun);
}

export async function getPayrollRunById(id: string, actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const run = await payrollRepository.findPayrollRunById(id);
  if (!run) throw new AppError(404, 'Payroll run not found', 'NOT_FOUND');

  return {
    ...toFrontendRun(run),
    records: (run.payrollRecords || []).map(toFrontendRecord),
  };
}

export async function createPayrollRun(params: {
  input: CreatePayrollRunInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { input, actorUserId, ipAddress } = params;
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const startDate = new Date(`${input.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${input.endDate}T00:00:00.000Z`);

  const run = await payrollRepository.createPayrollRun({
    data: {
      name: input.name,
      cutoffType: input.cutoffType,
      startDate,
      endDate,
      status: PayrollRunStatus.DRAFT,
      processedBy: { connect: { id: actorUserId } },
    },
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Created payroll run',
      details: `Created payroll run "${input.name}" (${input.startDate} to ${input.endDate})`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendRun(run);
}

export async function lockAttendance(payrollRunId: string, actorUserId: string, ipAddress?: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const run = await payrollRepository.findPayrollRunById(payrollRunId);
  if (!run) throw new AppError(404, 'Payroll run not found', 'NOT_FOUND');

  if (run.status === PayrollRunStatus.PUBLISHED) {
    throw new AppError(400, 'Cannot modify attendance lock on a published payroll run', 'RUN_PUBLISHED');
  }

  const updated = await payrollRepository.updatePayrollRunStatus({
    id: payrollRunId,
    status: PayrollRunStatus.ATTENDANCE_LOCKED,
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Locked attendance for payroll',
      details: `Locked attendance for run "${run.name}"`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendRun(updated);
}

export async function unlockAttendance(payrollRunId: string, actorUserId: string, ipAddress?: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const run = await payrollRepository.findPayrollRunById(payrollRunId);
  if (!run) throw new AppError(404, 'Payroll run not found', 'NOT_FOUND');

  if (run.status === PayrollRunStatus.PUBLISHED) {
    throw new AppError(400, 'Cannot unlock attendance on a published payroll run', 'RUN_PUBLISHED');
  }

  const updated = await payrollRepository.updatePayrollRunStatus({
    id: payrollRunId,
    status: PayrollRunStatus.DRAFT,
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Unlocked attendance for payroll',
      details: `Reverted run "${run.name}" to DRAFT`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendRun(updated);
}

export async function calculatePayrollRun(payrollRunId: string, actorUserId: string, ipAddress?: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const run = await payrollRepository.findPayrollRunById(payrollRunId);
  if (!run) throw new AppError(404, 'Payroll run not found', 'NOT_FOUND');

  if (run.status === PayrollRunStatus.PUBLISHED) {
    throw new AppError(400, 'Cannot re-calculate a published payroll run', 'RUN_PUBLISHED');
  }

  const activeEmployees = await prisma.employee.findMany({
    where: { status: EmployeeStatus.ACTIVE },
    include: { department: true },
    orderBy: { surname: 'asc' },
  });

  const isSemiMonthly = run.cutoffType === CutoffType.FIRST_HALF || run.cutoffType === CutoffType.SECOND_HALF;
  const monthName = MONTH_NAMES[run.startDate.getUTCMonth()] ?? 'January';
  const year = run.startDate.getUTCFullYear();

  // Prepare batch records
  const calculatedRecords = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const employee of activeEmployees) {
    // 1. Fetch attendance records in date range
    const attendanceLogs = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: run.startDate, lte: run.endDate },
      },
    });

    let presentDays = 0;
    let lateDays = 0;
    let lateMinutes = 0;

    for (const log of attendanceLogs) {
      if (log.status === 'PRESENT') {
        presentDays++;
      } else if (log.status === 'LATE') {
        lateDays++;
        lateMinutes += parseLateMinutes(log.timeIn);
      }
    }

    // 2. Fetch approved paid leaves in date range
    const approvedLeaves = await prisma.leaveRecord.findMany({
      where: {
        employeeId: employee.id,
        status: LeaveStatus.APPROVED,
        startDate: { lte: run.endDate },
        endDate: { gte: run.startDate },
      },
    });

    const leaveDays = approvedLeaves.reduce((acc, l) => acc + l.numberOfDays, 0);

    // Compute total days worked:
    // If employee has attendance logs or leaves, use the exact sum.
    // If no attendance logs exist yet, provide standard days for the cutoff (11 for semi-monthly, 22 for monthly).
    let daysWorked = presentDays + lateDays + leaveDays;
    if (attendanceLogs.length === 0 && approvedLeaves.length === 0) {
      daysWorked = isSemiMonthly ? 11 : 22;
    }

    const functionalRate = employee.functionalRate ? Number(employee.functionalRate) : 1500;
    const basicSalary = Math.round(functionalRate * daysWorked * 100) / 100;
    const allowances = isSemiMonthly ? 1500 : 3000;
    const gasoline = employee.gasolineAllowance
      ? Number(isSemiMonthly ? Math.round(Number(employee.gasolineAllowance) / 2) : Number(employee.gasolineAllowance))
      : 0;

    const grossPay = Math.round((basicSalary + allowances + gasoline) * 100) / 100;

    // 3. Tardiness
    const tardiness = calculateTardiness(functionalRate, lateMinutes);

    // 4. Statutory & Taxes
    const statutory = calculateStatutoryAndTaxes({
      basicSalary,
      allowances,
      gasoline,
      tardinessDeduction: tardiness.tardinessDeduction,
      isSemiMonthly,
      profileEmployeeShare: employee.employeeShare ? Number(employee.employeeShare) : null,
    });

    // 5. Deductions
    const cashAdvance = employee.cashAdvanceBalance
      ? Number(isSemiMonthly ? Math.round(Number(employee.cashAdvanceBalance) / 2) : Number(employee.cashAdvanceBalance))
      : 0;
    const otherDeductions = 0;

    const empTotalDeductions = Math.round(
      (tardiness.tardinessDeduction +
        statutory.sss +
        statutory.philHealth +
        statutory.pagIbig +
        statutory.taxWithheld +
        cashAdvance +
        otherDeductions) * 100
    ) / 100;

    const netPay = Math.round((grossPay - empTotalDeductions) * 100) / 100;

    totalGross += grossPay;
    totalDeductions += empTotalDeductions;
    totalNet += netPay;

    calculatedRecords.push({
      payrollRunId: run.id,
      employeeId: employee.id,
      month: monthName,
      year,
      startDate: run.startDate,
      endDate: run.endDate,
      status: PayrollRecordStatus.DRAFT,
      functionalRate,
      daysWorked,
      basicSalary,
      allowances,
      gasoline,
      grossPay,
      tardinessMinutes: tardiness.lateMinutes,
      tardinessDeduction: tardiness.tardinessDeduction,
      sssDeduction: statutory.sss,
      philHealthDeduction: statutory.philHealth,
      pagIbigDeduction: statutory.pagIbig,
      taxWithheld: statutory.taxWithheld,
      cashAdvance,
      employeeShare: statutory.sss + statutory.philHealth + statutory.pagIbig,
      otherDeductions,
      totalDeductions: empTotalDeductions,
      netPay,
      processedById: actorUserId,
    });
  }

  const updatedRun = await payrollRepository.saveBatchCalculatedRecords({
    payrollRunId: run.id,
    records: calculatedRecords,
    totals: {
      totalGross: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
    },
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Calculated payroll batch',
      details: `Batch calculated ${calculatedRecords.length} employees for run "${run.name}"`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return {
    ...toFrontendRun(updatedRun),
    records: (updatedRun.payrollRecords || []).map(toFrontendRecord),
  };
}

export async function publishPayrollRun(payrollRunId: string, actorUserId: string, ipAddress?: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const run = await payrollRepository.findPayrollRunById(payrollRunId);
  if (!run) throw new AppError(404, 'Payroll run not found', 'NOT_FOUND');

  if (run.status !== PayrollRunStatus.CALCULATED) {
    throw new AppError(400, 'Payroll run must be calculated before publishing', 'NOT_CALCULATED');
  }

  const published = await payrollRepository.updatePayrollRunStatus({
    id: payrollRunId,
    status: PayrollRunStatus.PUBLISHED,
    publishedAt: new Date(),
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Published payroll run',
      details: `Published payroll run "${run.name}" — payslips released to employees`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendRun(published);
}

export async function deletePayrollRun(payrollRunId: string, actorUserId: string, ipAddress?: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const run = await payrollRepository.findPayrollRunById(payrollRunId);
  if (!run) throw new AppError(404, 'Payroll run not found', 'NOT_FOUND');

  if (run.status === PayrollRunStatus.PUBLISHED && actor.role !== Role.ADMIN) {
    throw new AppError(403, 'Only administrators can delete a published payroll run', 'FORBIDDEN');
  }

  await payrollRepository.deletePayrollRun({
    id: payrollRunId,
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Deleted payroll run',
      details: `Deleted payroll run "${run.name}"`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return { success: true, message: `Payroll run "${run.name}" deleted successfully` };
}

export async function listPayrollRecords(params: {
  actorUserId: string;
  payrollRunId?: string | undefined;
  month?: string | undefined;
  year?: number | undefined;
}) {
  const { actorUserId, payrollRunId, month, year } = params;
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');

  // If actor is an EMPLOYEE: strictly return their own PUBLISHED records
  if (actor.role === Role.EMPLOYEE) {
    if (!actor.employeeId) return [];
    const employee = await employeeRepository.findByEmployeeNumber(actor.employeeId);
    if (!employee) return [];

    const records = await payrollRepository.listPayrollRecords({
      employeeId: employee.id,
      status: PayrollRecordStatus.PUBLISHED,
      month,
      year,
    });
    return records.map(toFrontendRecord);
  }

  // Admin / HR:
  requirePayrollAccess(actor);
  const records = await payrollRepository.listPayrollRecords({
    payrollRunId,
    month,
    year,
  });
  return records.map(toFrontendRecord);
}

export async function getPayrollRecordById(id: string, actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');

  const record = await payrollRepository.findPayrollRecordById(id);
  if (!record) throw new AppError(404, 'Payroll record not found', 'NOT_FOUND');

  if (actor.role === Role.EMPLOYEE) {
    const employee = actor.employeeId
      ? await employeeRepository.findByEmployeeNumber(actor.employeeId)
      : null;
    if (!employee || record.employeeId !== employee.id || record.status !== PayrollRecordStatus.PUBLISHED) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }
  } else {
    requirePayrollAccess(actor);
  }

  return toFrontendRecord(record);
}

export async function adjustPayrollRecord(params: {
  id: string;
  input: AdjustPayrollRecordInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { id, input, actorUserId, ipAddress } = params;
  const actor = await userRepository.findById(actorUserId);
  if (!actor) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  requirePayrollAccess(actor);

  const existing = await payrollRepository.findPayrollRecordById(id);
  if (!existing) throw new AppError(404, 'Payroll record not found', 'NOT_FOUND');

  if (existing.status === PayrollRecordStatus.PUBLISHED && actor.role !== Role.ADMIN) {
    throw new AppError(403, 'Cannot modify a published payroll record without Administrator privileges', 'FORBIDDEN');
  }

  const functionalRate = input.functionalRate ?? Number(existing.functionalRate);
  const daysWorked = input.daysWorked ?? existing.daysWorked;
  const basicSalary = Math.round(functionalRate * daysWorked * 100) / 100;
  const allowances = input.allowances ?? Number(existing.allowances);
  const gasoline = input.gasoline ?? Number(existing.gasoline);
  const grossPay = Math.round((basicSalary + allowances + gasoline) * 100) / 100;

  const tardinessMinutes = input.tardinessMinutes ?? existing.tardinessMinutes;
  const tardiness = calculateTardiness(functionalRate, tardinessMinutes);

  const sssDeduction = input.sssDeduction ?? Number(existing.sssDeduction);
  const philHealthDeduction = input.philHealthDeduction ?? Number(existing.philHealthDeduction);
  const pagIbigDeduction = input.pagIbigDeduction ?? Number(existing.pagIbigDeduction);
  const taxWithheld = input.taxWithheld ?? Number(existing.taxWithheld);
  const cashAdvance = input.cashAdvance ?? Number(existing.cashAdvance);
  const otherDeductions = input.otherDeductions ?? Number(existing.otherDeductions);

  const totalDeductions = Math.round(
    (tardiness.tardinessDeduction +
      sssDeduction +
      philHealthDeduction +
      pagIbigDeduction +
      taxWithheld +
      cashAdvance +
      otherDeductions) * 100
  ) / 100;

  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  const updated = await payrollRepository.updatePayrollRecord({
    id,
    data: {
      functionalRate,
      daysWorked,
      basicSalary,
      allowances,
      gasoline,
      grossPay,
      tardinessMinutes,
      tardinessDeduction: tardiness.tardinessDeduction,
      sssDeduction,
      philHealthDeduction,
      pagIbigDeduction,
      taxWithheld,
      cashAdvance,
      employeeShare: sssDeduction + philHealthDeduction + pagIbigDeduction,
      otherDeductions,
      totalDeductions,
      netPay,
    },
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Adjusted payroll record',
      details: `Adjusted payroll for ${existing.employee.firstName} ${existing.employee.surname} (${existing.employee.employeeNumber})`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendRecord(updated);
}
