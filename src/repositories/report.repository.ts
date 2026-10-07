import {
  AttendanceStatus,
  EmployeeStatus,
  EmploymentChangeType,
  Prisma,
} from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export interface ReportFilterParams {
  departmentId?: string | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  search?: string | undefined;
}

export async function getEmploymentReportData(filters: ReportFilterParams) {
  const where: Prisma.EmployeeWhereInput = {};

  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }

  if (filters.startDate || filters.endDate) {
    where.employmentDate = {};
    if (filters.startDate) where.employmentDate.gte = filters.startDate;
    if (filters.endDate) where.employmentDate.lte = filters.endDate;
  }

  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { employeeNumber: { contains: s, mode: 'insensitive' } },
      { firstName: { contains: s, mode: 'insensitive' } },
      { surname: { contains: s, mode: 'insensitive' } },
      { position: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [employees, departments, statusCounts, departmentCounts] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      orderBy: [{ surname: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.employee.groupBy({
      by: ['status'],
      where: filters.departmentId ? { departmentId: filters.departmentId } : {},
      _count: { _all: true },
    }),
    prisma.employee.groupBy({
      by: ['departmentId'],
      _count: { _all: true },
    }),
  ]);

  return { employees, departments, statusCounts, departmentCounts };
}

export async function getPromotionReportData(filters: ReportFilterParams) {
  const where: Prisma.EmploymentStatusChangeWhereInput = {
    changeType: EmploymentChangeType.PROMOTION,
  };

  if (filters.departmentId) {
    where.OR = [
      { newDepartmentId: filters.departmentId },
      { employee: { departmentId: filters.departmentId } },
    ];
  }

  if (filters.startDate || filters.endDate) {
    where.effectiveDate = {};
    if (filters.startDate) where.effectiveDate.gte = filters.startDate;
    if (filters.endDate) where.effectiveDate.lte = filters.endDate;
  }

  if (filters.search) {
    const s = filters.search.trim();
    where.employee = {
      OR: [
        { employeeNumber: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { surname: { contains: s, mode: 'insensitive' } },
        { position: { contains: s, mode: 'insensitive' } },
      ],
    };
  }

  const promotions = await prisma.employmentStatusChange.findMany({
    where,
    include: {
      employee: {
        include: {
          department: { select: { id: true, name: true } },
        },
      },
      previousDepartment: { select: { id: true, name: true } },
      newDepartment: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, username: true } },
    },
    orderBy: { effectiveDate: 'desc' },
  });

  return promotions;
}

export async function getAttendanceReportData(filters: ReportFilterParams) {
  const employeeWhere: Prisma.EmployeeWhereInput = {};

  if (filters.departmentId) {
    employeeWhere.departmentId = filters.departmentId;
  }

  if (filters.search) {
    const s = filters.search.trim();
    employeeWhere.OR = [
      { employeeNumber: { contains: s, mode: 'insensitive' } },
      { firstName: { contains: s, mode: 'insensitive' } },
      { surname: { contains: s, mode: 'insensitive' } },
      { position: { contains: s, mode: 'insensitive' } },
    ];
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: {
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ surname: 'asc' }, { firstName: 'asc' }],
  });

  const empIds = employees.map((e) => e.id);

  const attendanceWhere: Prisma.AttendanceRecordWhereInput = {
    employeeId: { in: empIds },
  };

  if (filters.startDate || filters.endDate) {
    attendanceWhere.date = {};
    if (filters.startDate) attendanceWhere.date.gte = filters.startDate;
    if (filters.endDate) attendanceWhere.date.lte = filters.endDate;
  }

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: attendanceWhere,
    select: {
      id: true,
      employeeId: true,
      date: true,
      timeIn: true,
      timeOut: true,
      status: true,
      remarks: true,
    },
    orderBy: { date: 'asc' },
  });

  return { attendanceRecords, employees };
}

export async function getReportFilterMetadata() {
  const [departments, attendanceRange, employeeRange] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.attendanceRecord.aggregate({
      _min: { date: true },
      _max: { date: true },
    }),
    prisma.employee.aggregate({
      _min: { employmentDate: true },
      _max: { employmentDate: true },
    }),
  ]);

  return {
    departments,
    dateBounds: {
      earliestAttendance: attendanceRange._min.date,
      latestAttendance: attendanceRange._max.date,
      earliestEmployment: employeeRange._min.employmentDate,
      latestEmployment: employeeRange._max.employmentDate,
    },
  };
}
