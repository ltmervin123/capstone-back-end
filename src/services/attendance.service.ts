import { AttendanceStatus, Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as attendanceRepository from '../repositories/attendance.repository.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import * as payrollRepository from '../repositories/payroll.repository.js';
import type { CreateAttendanceInput } from '../validators/attendance.validator.js';

function mapStatus(status: CreateAttendanceInput['status']): AttendanceStatus {
  switch (status) {
    case 'Late':
      return AttendanceStatus.LATE;
    case 'Absent':
      return AttendanceStatus.ABSENT;
    case 'On Leave':
      return AttendanceStatus.ON_LEAVE;
    default:
      return AttendanceStatus.PRESENT;
  }
}

function mapStatusToFrontend(status: AttendanceStatus): 'Present' | 'Late' | 'Absent' | 'On Leave' {
  switch (status) {
    case AttendanceStatus.LATE:
      return 'Late';
    case AttendanceStatus.ABSENT:
      return 'Absent';
    case AttendanceStatus.ON_LEAVE:
      return 'On Leave';
    default:
      return 'Present';
  }
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'Invalid date', 'VALIDATION_ERROR');
  }
  return date;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTime(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  return match ? `${match[1]}:${match[2]}` : trimmed;
}

function toFrontendAttendance(
  record: Awaited<ReturnType<typeof attendanceRepository.listAttendance>>[number],
) {
  return {
    id: record.id,
    employeeId: record.employee.employeeNumber,
    employeeName: `${record.employee.firstName} ${record.employee.surname}`,
    date: record.date.toISOString().slice(0, 10),
    timeIn: normalizeTime(record.timeIn ?? '') ?? '',
    timeOut: normalizeTime(record.timeOut ?? '') ?? '',
    status: mapStatusToFrontend(record.status),
    remarks: record.remarks ?? '',
  };
}

export async function listAttendance(actorUserId: string) {
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

    const records = await attendanceRepository.listAttendanceByEmployeeId(employee.id);
    return records.map(toFrontendAttendance);
  }

  const records = await attendanceRepository.listAttendance();
  return records.map(toFrontendAttendance);
}

export async function createAttendance(params: {
  input: CreateAttendanceInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const { input, actorUserId, ipAddress } = params;

  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role !== Role.ADMIN && actor.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  const employee = await employeeRepository.findByEmployeeNumber(input.employeeNumber);
  if (!employee) {
    throw new AppError(404, 'Employee not found', 'EMPLOYEE_NOT_FOUND');
  }

  const date = parseDate(input.date);
  const lockedRun = await payrollRepository.findConflictingLockedRun(date);
  if (lockedRun && actor.role !== Role.ADMIN) {
    throw new AppError(
      400,
      `Attendance is locked for pay period "${lockedRun.name}". Punch records cannot be added while payroll is processing.`,
      'PAYROLL_LOCKED',
    );
  }

  const existing = await attendanceRepository.findByEmployeeIdAndDate(employee.id, date);
  if (existing) {
    throw new AppError(
      409,
      'Attendance already recorded for this employee on this date',
      'ATTENDANCE_EXISTS',
    );
  }

  const created = await attendanceRepository.createAttendance({
    record: {
      employeeId: employee.id,
      date,
      timeIn: normalizeTime(input.timeIn),
      timeOut: normalizeTime(input.timeOut),
      status: mapStatus(input.status),
      remarks: emptyToNull(input.remarks),
      recordedById: actorUserId,
    },
    audit: {
      userId: actorUserId,
      username: actor.username,
      action: 'Recorded attendance',
      details: `${employee.employeeNumber} — ${employee.firstName} ${employee.surname} (${input.status}) on ${input.date}`,
      ...(ipAddress ? { ipAddress } : {}),
    },
  });

  return toFrontendAttendance(created);
}
