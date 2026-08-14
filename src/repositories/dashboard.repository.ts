import {
  AttendanceStatus,
  EmployeeStatus,
  LeaveStatus,
  type ApplicantStatus,
  type LeaveType,
} from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export async function countEmployeesByStatus() {
  return prisma.employee.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
}

export async function countEmployeesByDepartment() {
  return prisma.employee.groupBy({
    by: ['departmentId'],
    _count: { _all: true },
  });
}

export async function listDepartments() {
  return prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

export async function countEmployeesByEducationLevel() {
  return prisma.employee.groupBy({
    by: ['educationLevel'],
    _count: { _all: true },
  });
}

export async function findLatestAttendanceDate(): Promise<Date | null> {
  const latest = await prisma.attendanceRecord.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  return latest?.date ?? null;
}

export async function countAttendanceByStatusForDate(date: Date) {
  return prisma.attendanceRecord.groupBy({
    by: ['status'],
    where: { date },
    _count: { _all: true },
  });
}

export async function countLeavesByStatus() {
  return prisma.leaveRecord.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
}

export async function countLeavesByType() {
  return prisma.leaveRecord.groupBy({
    by: ['leaveType'],
    _count: { _all: true },
  });
}

export async function countApprovedLeavesOnDate(date: Date) {
  return prisma.leaveRecord.count({
    where: {
      status: LeaveStatus.APPROVED,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });
}

export async function countApplicantsByStatus() {
  return prisma.applicant.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
}

export function employeeStatusCount(
  rows: Array<{ status: EmployeeStatus; _count: { _all: number } }>,
  status: EmployeeStatus,
): number {
  return rows.find((row) => row.status === status)?._count._all ?? 0;
}

export function attendanceStatusCount(
  rows: Array<{ status: AttendanceStatus; _count: { _all: number } }>,
  status: AttendanceStatus,
): number {
  return rows.find((row) => row.status === status)?._count._all ?? 0;
}

export function leaveStatusCount(
  rows: Array<{ status: LeaveStatus; _count: { _all: number } }>,
  status: LeaveStatus,
): number {
  return rows.find((row) => row.status === status)?._count._all ?? 0;
}

export function applicantStatusCount(
  rows: Array<{ status: ApplicantStatus; _count: { _all: number } }>,
  status: ApplicantStatus,
): number {
  return rows.find((row) => row.status === status)?._count._all ?? 0;
}

export function leaveTypeCount(
  rows: Array<{ leaveType: LeaveType; _count: { _all: number } }>,
  leaveType: LeaveType,
): number {
  return rows.find((row) => row.leaveType === leaveType)?._count._all ?? 0;
}
