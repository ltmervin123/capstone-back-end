import { EmployeeStatus, Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as reportRepository from '../repositories/report.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { permissionsFromJson } from '../types/auth.js';

export async function requireReportsActor(actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role === Role.ADMIN) {
    return actor;
  }

  const permissions = permissionsFromJson(actor.permissions);
  if (permissions && permissions.reports === true) {
    return actor;
  }

  throw new AppError(403, 'Forbidden', 'FORBIDDEN');
}

function calculateTenureYears(employmentDate: Date): number {
  const diffMs = Date.now() - employmentDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.floor(diffDays / 365.25));
}

export async function getEmploymentReport(
  actorUserId: string,
  filters: reportRepository.ReportFilterParams,
) {
  await requireReportsActor(actorUserId);

  const { employees, departments, statusCounts, departmentCounts } =
    await reportRepository.getEmploymentReportData(filters);

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  const activeEmployees =
    statusCounts.find((s) => s.status === EmployeeStatus.ACTIVE)?._count._all ?? 0;
  const inactiveEmployees =
    statusCounts.find((s) => s.status === EmployeeStatus.INACTIVE)?._count._all ?? 0;
  const retiredEmployees =
    statusCounts.find((s) => s.status === EmployeeStatus.RETIRED)?._count._all ?? 0;
  const totalEmployees = activeEmployees + inactiveEmployees + retiredEmployees;

  // Retention rate: active / (total)
  const retentionRate =
    totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 1000) / 10 : 100;

  // Department distribution for charts
  const departmentDistribution = departmentCounts.map((dc) => {
    const deptName = deptMap.get(dc.departmentId) ?? 'Unassigned';
    const count = dc._count._all;
    const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
    return { name: deptName, count, pct };
  }).sort((a, b) => b.count - a.count);

  // Tenure distribution
  const tenureBuckets = {
    '< 1 Year': 0,
    '1 - 3 Years': 0,
    '3 - 5 Years': 0,
    '5 - 10 Years': 0,
    '10+ Years': 0,
  };

  employees.forEach((emp) => {
    const years = calculateTenureYears(emp.employmentDate);
    if (years < 1) tenureBuckets['< 1 Year']++;
    else if (years <= 3) tenureBuckets['1 - 3 Years']++;
    else if (years <= 5) tenureBuckets['3 - 5 Years']++;
    else if (years <= 10) tenureBuckets['5 - 10 Years']++;
    else tenureBuckets['10+ Years']++;
  });

  const tenureDistribution = Object.entries(tenureBuckets).map(([range, count]) => ({
    range,
    count,
  }));

  // Status distribution
  const statusDistribution = [
    { status: 'Active', count: activeEmployees, fill: '#10b981' },
    { status: 'Inactive', count: inactiveEmployees, fill: '#f59e0b' },
    { status: 'Retired', count: retiredEmployees, fill: '#6b7280' },
  ];

  // Hired in past 1 year vs total
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentHires = employees.filter((e) => e.employmentDate >= oneYearAgo).length;
  const growthRate = totalEmployees > 0 ? Math.round((recentHires / totalEmployees) * 100) : 0;

  // Tabular records
  const records = employees.map((emp) => ({
    id: emp.id,
    employeeNumber: emp.employeeNumber,
    surname: emp.surname,
    firstName: emp.firstName,
    middleName: emp.middleName,
    fullName: `${emp.surname}, ${emp.firstName}${emp.middleName ? ' ' + emp.middleName : ''}`,
    departmentId: emp.departmentId,
    department: emp.department.name,
    position: emp.position,
    employmentDate: emp.employmentDate.toISOString().slice(0, 10),
    serviceDuration: emp.serviceDuration || `${calculateTenureYears(emp.employmentDate)} Years`,
    status: emp.status,
    educationLevel: emp.educationLevel || 'Unspecified',
  }));

  return {
    metrics: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      retiredEmployees,
      retentionRate,
      growthRate,
      recentHires,
    },
    charts: {
      departmentDistribution,
      tenureDistribution,
      statusDistribution,
    },
    records,
  };
}

export async function getPromotionReport(
  actorUserId: string,
  filters: reportRepository.ReportFilterParams,
) {
  await requireReportsActor(actorUserId);

  const promotions = await reportRepository.getPromotionReportData(filters);

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  let thisYearCount = 0;
  let nextYearCount = 0;
  let approvedCount = 0;
  let pendingCount = 0;

  const yearlyMap = new Map<number, { approved: number; pending: number; total: number }>();
  const deptMap = new Map<string, number>();

  const records = promotions.map((p) => {
    const effDate = p.effectiveDate;
    const year = effDate.getFullYear();
    const isApproved = Boolean(p.approvedById || (p.remarks && p.remarks.toLowerCase().includes('approved')));

    if (year === currentYear) thisYearCount++;
    if (year === nextYear) nextYearCount++;

    if (isApproved) approvedCount++;
    else pendingCount++;

    const yrEntry = yearlyMap.get(year) || { approved: 0, pending: 0, total: 0 };
    if (isApproved) yrEntry.approved++;
    else yrEntry.pending++;
    yrEntry.total++;
    yearlyMap.set(year, yrEntry);

    const deptName = p.newDepartment?.name || p.employee.department.name;
    deptMap.set(deptName, (deptMap.get(deptName) || 0) + 1);

    const promotionYearText =
      year === currentYear
        ? `This Year (${year})`
        : year === nextYear
          ? `Next Year (${year})`
          : `${year}`;

    return {
      id: p.id,
      employeeId: p.employee.id,
      employeeNumber: p.employee.employeeNumber,
      surname: p.employee.surname,
      firstName: p.employee.firstName,
      fullName: `${p.employee.surname}, ${p.employee.firstName}`,
      department: deptName,
      previousPosition: p.previousPosition || p.employee.position,
      promotedPosition: p.newPosition || 'Promoted Role',
      effectiveDate: effDate.toISOString().slice(0, 10),
      promotionYear: promotionYearText,
      year,
      promotionStatus: isApproved ? 'Approved & Scheduled' : 'Recommended & Pending',
      rationale: p.remarks || 'Standard promotion candidate evaluation based on tenure and qualifications.',
      approvedBy: p.approvedBy?.username || null,
    };
  });

  const yearlyPipeline = Array.from(yearlyMap.entries())
    .map(([year, counts]) => ({
      year: year.toString(),
      approved: counts.approved,
      pending: counts.pending,
      total: counts.total,
    }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  const departmentBreakdown = Array.from(deptMap.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  return {
    metrics: {
      thisYearCount,
      nextYearCount,
      totalEvaluated: promotions.length,
      approvedCount,
      pendingCount,
    },
    charts: {
      yearlyPipeline,
      departmentBreakdown,
    },
    records,
  };
}

export async function getAttendanceReport(
  actorUserId: string,
  filters: reportRepository.ReportFilterParams,
) {
  await requireReportsActor(actorUserId);

  const { attendanceRecords, employees } =
    await reportRepository.getAttendanceReportData(filters);

  // Group logs by employeeId
  const logsByEmp = new Map<string, typeof attendanceRecords>();
  attendanceRecords.forEach((log) => {
    const list = logsByEmp.get(log.employeeId) || [];
    list.push(log);
    logsByEmp.set(log.employeeId, list);
  });

  let totalPresent = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalOnLeave = 0;

  attendanceRecords.forEach((log) => {
    switch (log.status) {
      case 'PRESENT':
        totalPresent++;
        break;
      case 'LATE':
        totalLate++;
        break;
      case 'ABSENT':
        totalAbsent++;
        break;
      case 'ON_LEAVE':
        totalOnLeave++;
        break;
    }
  });

  const totalLogs = attendanceRecords.length;
  const workingLogs = totalPresent + totalLate;
  const avgPunctuality =
    workingLogs > 0 ? Math.round((totalPresent / workingLogs) * 100) : 100;
  const overallAttendanceRate =
    totalLogs > 0 ? Math.round(((totalPresent + totalLate) / totalLogs) * 100) : 100;

  // Timeseries trend (grouped by date formatted as YYYY-MM-DD or Month)
  const dateMap = new Map<string, { present: number; late: number; absent: number; onLeave: number }>();
  attendanceRecords.forEach((log) => {
    const dStr = log.date.toISOString().slice(0, 10);
    const entry = dateMap.get(dStr) || { present: 0, late: 0, absent: 0, onLeave: 0 };
    if (log.status === 'PRESENT') entry.present++;
    else if (log.status === 'LATE') entry.late++;
    else if (log.status === 'ABSENT') entry.absent++;
    else if (log.status === 'ON_LEAVE') entry.onLeave++;
    dateMap.set(dStr, entry);
  });

  const timeseriesTrend = Array.from(dateMap.entries())
    .map(([date, counts]) => {
      const activeTotal = counts.present + counts.late;
      const punctuality = activeTotal > 0 ? Math.round((counts.present / activeTotal) * 100) : 100;
      return {
        date,
        present: counts.present,
        late: counts.late,
        absent: counts.absent,
        onLeave: counts.onLeave,
        punctualityRate: punctuality,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Employee tabular records
  const records = employees.map((emp) => {
    const empLogs = logsByEmp.get(emp.id) || [];
    const present = empLogs.filter((l) => l.status === 'PRESENT').length;
    const late = empLogs.filter((l) => l.status === 'LATE').length;
    const absent = empLogs.filter((l) => l.status === 'ABSENT').length;
    const onLeave = empLogs.filter((l) => l.status === 'ON_LEAVE').length;
    const empTotal = present + late + absent + onLeave;
    const empWorking = present + late;

    const punctualityRate =
      empWorking > 0 ? Math.round((present / empWorking) * 100) : 100;
    const attendanceRate =
      empTotal > 0 ? Math.round(((present + late) / empTotal) * 100) : 100;

    let performanceLabel = 'No Logs';
    if (empTotal > 0) {
      if (punctualityRate >= 90) performanceLabel = 'Excellent';
      else if (punctualityRate >= 75) performanceLabel = 'Satisfactory';
      else performanceLabel = 'Review Req';
    }

    return {
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      surname: emp.surname,
      firstName: emp.firstName,
      fullName: `${emp.surname}, ${emp.firstName}`,
      departmentId: emp.departmentId,
      department: emp.department.name,
      position: emp.position,
      present,
      late,
      absent,
      onLeave,
      totalLogs: empTotal,
      punctualityRate,
      attendanceRate,
      performanceRating: performanceLabel,
    };
  });

  const statusDistribution = [
    { name: 'Present', count: totalPresent, fill: '#10b981' },
    { name: 'Late', count: totalLate, fill: '#f59e0b' },
    { name: 'Absent', count: totalAbsent, fill: '#ef4444' },
    { name: 'On Leave', count: totalOnLeave, fill: '#a855f7' },
  ];

  return {
    metrics: {
      avgPunctuality,
      attendanceRate: overallAttendanceRate,
      totalChecked: totalLogs,
      lates: totalLate,
      presents: totalPresent,
      absents: totalAbsent,
      leaves: totalOnLeave,
    },
    charts: {
      statusDistribution,
      timeseriesTrend,
    },
    records,
  };
}

export async function getReportFilters(actorUserId: string) {
  await requireReportsActor(actorUserId);
  return reportRepository.getReportFilterMetadata();
}
