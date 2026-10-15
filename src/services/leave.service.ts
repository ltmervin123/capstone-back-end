import { LeaveStatus, LeaveType, Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as leaveRepository from '../repositories/leave.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import * as payrollRepository from '../repositories/payroll.repository.js';
import type { CreateLeaveInput } from '../validators/leave.validator.js';

const ANNUAL_LEAVE_ALLOCATION_DAYS = 7;

const LEAVE_TYPE_TO_DB: Record<CreateLeaveInput['type'], LeaveType> = {
  'Leave Credits': LeaveType.LEAVE_CREDITS,
  'Maternity Leave': LeaveType.MATERNITY,
  'Leave for Victims of VAW-C': LeaveType.VAWC,
  'Paternity Leave': LeaveType.PATERNITY,
  'Solo Parents Leave': LeaveType.SOLO_PARENT,
  'Study Leave': LeaveType.STUDY,
  'Special Leave': LeaveType.SPECIAL,
  'Authorized Absence': LeaveType.AUTHORIZED_ABSENCE,
  'Authorized Undertime': LeaveType.AUTHORIZED_UNDERTIME,
};

const LEAVE_TYPE_TO_FRONTEND: Record<LeaveType, CreateLeaveInput['type']> = {
  [LeaveType.LEAVE_CREDITS]: 'Leave Credits',
  [LeaveType.MATERNITY]: 'Maternity Leave',
  [LeaveType.VAWC]: 'Leave for Victims of VAW-C',
  [LeaveType.PATERNITY]: 'Paternity Leave',
  [LeaveType.SOLO_PARENT]: 'Solo Parents Leave',
  [LeaveType.STUDY]: 'Study Leave',
  [LeaveType.SPECIAL]: 'Special Leave',
  [LeaveType.AUTHORIZED_ABSENCE]: 'Authorized Absence',
  [LeaveType.AUTHORIZED_UNDERTIME]: 'Authorized Undertime',
};

function mapStatusToFrontend(status: LeaveStatus): 'Approved' | 'Pending' | 'Rejected' {
  switch (status) {
    case LeaveStatus.APPROVED:
      return 'Approved';
    case LeaveStatus.REJECTED:
      return 'Rejected';
    default:
      return 'Pending';
  }
}

function parseDate(value: string, fieldName: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `Invalid ${fieldName}`, 'VALIDATION_ERROR');
  }
  return date;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function toFrontendLeave(record: Awaited<ReturnType<typeof leaveRepository.listLeaves>>[number]) {
  return {
    id: record.id,
    employeeId: record.employee.employeeNumber,
    employeeName: `${record.employee.firstName} ${record.employee.surname}`,
    employeePosition: record.employee.position,
    employeeDepartment: record.employee.department.name,
    type: LEAVE_TYPE_TO_FRONTEND[record.leaveType],
    startDate: record.startDate.toISOString().slice(0, 10),
    endDate: record.endDate.toISOString().slice(0, 10),
    numberOfDays: record.numberOfDays,
    timeFrom: record.timeFrom ?? '',
    timeTo: record.timeTo ?? '',
    status: mapStatusToFrontend(record.status),
    reason: record.reason,
  };
}

async function remainingAnnualLeaveBalance(
  employeeId: string,
  year: number,
  excludeLeaveId?: string,
): Promise<number> {
  const records = await leaveRepository.listEmployeeLeavesInYear(employeeId, year);
  const usedDays = records
    .filter(
      (record) =>
        record.id !== excludeLeaveId &&
        record.status !== LeaveStatus.REJECTED,
    )
    .reduce((sum, record) => sum + record.numberOfDays, 0);

  return Math.max(0, ANNUAL_LEAVE_ALLOCATION_DAYS - usedDays);
}

export async function listLeaves(actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role === Role.EMPLOYEE) {
    if (!actor.employeeId) {
      return [];
    }

    const employee = await employeeRepository.findByEmployeeNumber(actor.employeeId);
    if (!employee) {
      return [];
    }

    const records = await leaveRepository.listLeavesByEmployeeId(employee.id);
    return records.map(toFrontendLeave);
  }

  const records = await leaveRepository.listLeaves();
  return records.map(toFrontendLeave);
}

export async function createLeave(params: {
  input: CreateLeaveInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { input, actorUserId, ipAddress } = params;

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const isHrActor = actor.role === Role.ADMIN || actor.role === Role.HR;
  let employeeNumber = input.employeeNumber;

  if (actor.role === Role.EMPLOYEE) {
    if (!actor.employeeId) {
      throw new AppError(400, 'Your account is not linked to an employee record', 'EMPLOYEE_NOT_LINKED');
    }
    employeeNumber = actor.employeeId.toUpperCase();
  } else if (!isHrActor) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const employee = await employeeRepository.findByEmployeeNumber(employeeNumber);
  if (!employee) {
    throw new AppError(404, 'Employee not found', 'EMPLOYEE_NOT_FOUND');
  }

  const startDate = parseDate(input.startDate, 'start date');
  const endDate = parseDate(input.endDate, 'end date');

  if (startDate > endDate) {
    throw new AppError(400, 'Start date cannot be after the end date.', 'VALIDATION_ERROR');
  }

  const lockedRun =
    (await payrollRepository.findConflictingLockedRun(startDate)) ||
    (await payrollRepository.findConflictingLockedRun(endDate));
  if (lockedRun && actor.role !== Role.ADMIN) {
    throw new AppError(
      400,
      `Leave requests cannot be filed within locked pay period "${lockedRun.name}".`,
      'PAYROLL_LOCKED',
    );
  }

  const leaveType = LEAVE_TYPE_TO_DB[input.type];

  const remaining = await remainingAnnualLeaveBalance(
    employee.id,
    startDate.getUTCFullYear(),
  );
  if (input.numberOfDays > remaining) {
    throw new AppError(
      400,
      `Leave Limit Reached: You are requesting ${input.numberOfDays} day(s), but only have ${remaining} day(s) remaining in your annual leave allocation.`,
      'LEAVE_LIMIT_REACHED',
    );
  }

  const created = await leaveRepository.createLeave({
    record: {
      employeeId: employee.id,
      leaveType,
      startDate,
      endDate,
      numberOfDays: input.numberOfDays,
      timeFrom: emptyToNull(input.timeFrom),
      timeTo: emptyToNull(input.timeTo),
      reason: input.reason,
      status: LeaveStatus.PENDING,
      createdById: actorUserId,
    },
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Filed leave request',
      details: `${employee.employeeNumber} — ${employee.firstName} ${employee.surname} (${input.type}) ${input.startDate} to ${input.endDate}`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendLeave(created);
}

export async function deleteLeave(params: {
  leaveId: string;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { leaveId, actorUserId, ipAddress } = params;

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role !== Role.ADMIN && actor.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const existing = await leaveRepository.findById(leaveId);
  if (!existing) {
    throw new AppError(404, 'Leave record not found', 'LEAVE_NOT_FOUND');
  }

  await leaveRepository.deleteLeave({
    id: existing.id,
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Deleted leave record',
      details: `${existing.employee.employeeNumber} — ${existing.employee.firstName} ${existing.employee.surname} (${LEAVE_TYPE_TO_FRONTEND[existing.leaveType]}) ${existing.startDate.toISOString().slice(0, 10)} to ${existing.endDate.toISOString().slice(0, 10)}`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return { id: existing.id };
}

export async function rejectLeave(params: {
  leaveId: string;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { leaveId, actorUserId, ipAddress } = params;

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role !== Role.ADMIN && actor.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const existing = await leaveRepository.findById(leaveId);
  if (!existing) {
    throw new AppError(404, 'Leave record not found', 'LEAVE_NOT_FOUND');
  }

  if (existing.status !== LeaveStatus.PENDING) {
    throw new AppError(
      409,
      existing.status === LeaveStatus.REJECTED
        ? 'This leave request has already been rejected'
        : 'This leave request has already been approved',
      'LEAVE_NOT_PENDING',
    );
  }

  const updated = await leaveRepository.updateLeaveStatus({
    id: existing.id,
    status: LeaveStatus.REJECTED,
    decidedById: actorUserId,
    decidedAt: new Date(),
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Rejected leave request',
      details: `${existing.employee.employeeNumber} — ${existing.employee.firstName} ${existing.employee.surname} (${LEAVE_TYPE_TO_FRONTEND[existing.leaveType]}) ${existing.startDate.toISOString().slice(0, 10)} to ${existing.endDate.toISOString().slice(0, 10)}`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendLeave(updated);
}

export async function approveLeave(params: {
  leaveId: string;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { leaveId, actorUserId, ipAddress } = params;

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role !== Role.ADMIN && actor.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const existing = await leaveRepository.findById(leaveId);
  if (!existing) {
    throw new AppError(404, 'Leave record not found', 'LEAVE_NOT_FOUND');
  }

  if (existing.status !== LeaveStatus.PENDING) {
    throw new AppError(
      409,
      existing.status === LeaveStatus.APPROVED
        ? 'This leave request has already been approved'
        : 'This leave request has already been rejected',
      'LEAVE_NOT_PENDING',
    );
  }

  const remaining = await remainingAnnualLeaveBalance(
    existing.employeeId,
    existing.startDate.getUTCFullYear(),
    existing.id,
  );
  if (existing.numberOfDays > remaining) {
    throw new AppError(
      400,
      `Leave Limit Reached: This request needs ${existing.numberOfDays} day(s), but only ${remaining} day(s) remain in the annual leave allocation.`,
      'LEAVE_LIMIT_REACHED',
    );
  }

  const lockedRun =
    (await payrollRepository.findConflictingLockedRun(existing.startDate)) ||
    (await payrollRepository.findConflictingLockedRun(existing.endDate));
  if (lockedRun && actor.role !== Role.ADMIN) {
    throw new AppError(
      400,
      `Leave requests cannot be approved within locked pay period "${lockedRun.name}".`,
      'PAYROLL_LOCKED',
    );
  }

  const updated = await leaveRepository.updateLeaveStatus({
    id: existing.id,
    status: LeaveStatus.APPROVED,
    decidedById: actorUserId,
    decidedAt: new Date(),
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Approved leave request',
      details: `${existing.employee.employeeNumber} — ${existing.employee.firstName} ${existing.employee.surname} (${LEAVE_TYPE_TO_FRONTEND[existing.leaveType]}) ${existing.startDate.toISOString().slice(0, 10)} to ${existing.endDate.toISOString().slice(0, 10)}`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendLeave(updated);
}
