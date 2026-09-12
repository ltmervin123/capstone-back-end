import {
  ApplicantStatus,
  AttendanceStatus,
  EmployeeStatus,
  LeaveStatus,
  LeaveType,
  Role,
} from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as dashboardRepository from '../repositories/dashboard.repository.js';
import * as userRepository from '../repositories/user.repository.js';

const LEAVE_TYPE_TO_FRONTEND: Record<LeaveType, string> = {
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

function percent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function startOfUtcDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function requireHrActor(actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role !== Role.ADMIN && actor.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  return actor;
}

export async function getDashboardSummary(actorUserId: string) {
  await requireHrActor(actorUserId);

  const today = startOfUtcDay(new Date());

  const [
    employeeStatusRows,
    departmentRows,
    departments,
    educationRows,
    latestAttendanceDate,
    leaveStatusRows,
    leaveTypeRows,
    activeLeaves,
    applicantStatusRows,
  ] = await Promise.all([
    dashboardRepository.countEmployeesByStatus(),
    dashboardRepository.countEmployeesByDepartment(),
    dashboardRepository.listDepartments(),
    dashboardRepository.countEmployeesByEducationLevel(),
    dashboardRepository.findLatestAttendanceDate(),
    dashboardRepository.countLeavesByStatus(),
    dashboardRepository.countLeavesByType(),
    dashboardRepository.countApprovedLeavesOnDate(today),
    dashboardRepository.countApplicantsByStatus(),
  ]);

  const attendanceDate = latestAttendanceDate ?? today;
  const attendanceStatusRows = await dashboardRepository.countAttendanceByStatusForDate(attendanceDate);

  const activeEmployees = dashboardRepository.employeeStatusCount(employeeStatusRows, EmployeeStatus.ACTIVE);
  const inactiveEmployees = dashboardRepository.employeeStatusCount(employeeStatusRows, EmployeeStatus.INACTIVE);
  const retiredEmployees = dashboardRepository.employeeStatusCount(employeeStatusRows, EmployeeStatus.RETIRED);
  const totalEmployees = activeEmployees + inactiveEmployees + retiredEmployees;

  const departmentNameById = new Map(departments.map((department) => [department.id, department.name]));
  const departmentCounts = departmentRows.map((row) => ({
    name: departmentNameById.get(row.departmentId) ?? 'Unassigned',
    count: row._count._all,
  }));
  const departmentTotal = departmentCounts.reduce((sum, row) => sum + row.count, 0) || 0;
  const departmentMax = Math.max(...departmentCounts.map((row) => row.count), 1);

  const present = dashboardRepository.attendanceStatusCount(attendanceStatusRows, AttendanceStatus.PRESENT);
  const late = dashboardRepository.attendanceStatusCount(attendanceStatusRows, AttendanceStatus.LATE);
  const absent = dashboardRepository.attendanceStatusCount(attendanceStatusRows, AttendanceStatus.ABSENT);
  const onLeave = dashboardRepository.attendanceStatusCount(attendanceStatusRows, AttendanceStatus.ON_LEAVE);
  const attendanceTotal = present + late + absent + onLeave;

  const approved = dashboardRepository.leaveStatusCount(leaveStatusRows, LeaveStatus.APPROVED);
  const pending = dashboardRepository.leaveStatusCount(leaveStatusRows, LeaveStatus.PENDING);
  const rejected = dashboardRepository.leaveStatusCount(leaveStatusRows, LeaveStatus.REJECTED);
  const leaveTotal = approved + pending + rejected;

  const leaveTypes = (Object.keys(LEAVE_TYPE_TO_FRONTEND) as LeaveType[])
    .map((leaveType) => ({
      type: LEAVE_TYPE_TO_FRONTEND[leaveType],
      count: dashboardRepository.leaveTypeCount(leaveTypeRows, leaveType),
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const leaveTypesTotal = leaveTypes.reduce((sum, row) => sum + row.count, 0);

  const educationCounts = educationRows
    .map((row) => ({
      level: row.educationLevel?.trim() || 'Unspecified',
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);
  const educationTotal = educationCounts.reduce((sum, row) => sum + row.count, 0);

  const applied = dashboardRepository.applicantStatusCount(applicantStatusRows, ApplicantStatus.APPLIED);
  const interviewing = dashboardRepository.applicantStatusCount(applicantStatusRows, ApplicantStatus.INTERVIEWING);
  const offered = dashboardRepository.applicantStatusCount(applicantStatusRows, ApplicantStatus.OFFERED);
  const hired = dashboardRepository.applicantStatusCount(applicantStatusRows, ApplicantStatus.HIRED);
  const applicantRejected = dashboardRepository.applicantStatusCount(applicantStatusRows, ApplicantStatus.REJECTED);
  const recruitmentTotal = applied + interviewing + offered + hired + applicantRejected;

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      totalEmployees,
      activeEmployees,
      retiredEmployees,
      activeLeaves,
    },
    attendance: {
      dateText: latestAttendanceDate ? latestAttendanceDate.toISOString().slice(0, 10) : 'No records',
      present,
      late,
      absent,
      onLeave,
      total: attendanceTotal,
      presentPct: percent(present, attendanceTotal),
      latePct: percent(late, attendanceTotal),
      absentPct: percent(absent, attendanceTotal),
      onLeavePct: percent(onLeave, attendanceTotal),
    },
    departments: departmentCounts
      .map((row) => ({
        name: row.name,
        count: row.count,
        pct: percent(row.count, departmentTotal),
        relativePct: percent(row.count, departmentMax),
      }))
      .sort((a, b) => b.count - a.count),
    leaves: {
      approved,
      pending,
      rejected,
      total: leaveTotal,
      approvedPct: percent(approved, leaveTotal),
      pendingPct: percent(pending, leaveTotal),
      rejectedPct: percent(rejected, leaveTotal),
      types: leaveTypes.map((row) => ({
        type: row.type,
        count: row.count,
        pct: percent(row.count, leaveTypesTotal),
      })),
    },
    education: educationCounts.map((row) => ({
      level: row.level,
      count: row.count,
      pct: percent(row.count, educationTotal),
    })),
    recruitment: {
      applied,
      interviewing,
      offered,
      hired,
      rejected: applicantRejected,
      total: recruitmentTotal,
      appliedPct: percent(applied, recruitmentTotal),
      interviewingPct: percent(interviewing, recruitmentTotal),
      offeredPct: percent(offered, recruitmentTotal),
      hiredPct: percent(hired, recruitmentTotal),
      rejectedPct: percent(applicantRejected, recruitmentTotal),
    },
  };
}
