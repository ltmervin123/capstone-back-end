import {
  AttendanceStatus,
  CutoffType,
  EmployeeStatus,
  EmploymentChangeType,
  PayrollRecordStatus,
  PayrollRunStatus,
  Role,
  Sex,
} from '../src/generated/prisma/index.js';
import { prisma } from '../src/lib/prisma.js';
import { permissionsToJson, type UserPermissions } from '../src/types/auth.js';
import bcrypt from 'bcryptjs';
import { DEPARTMENTS, DOCUMENT_CATEGORIES } from './seed-reference-data.js';

const BCRYPT_ROUNDS = 12;

interface SeedUser {
  username: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  isApproved: boolean;
  permissions: UserPermissions;
  employeeId?: string;
}

const SEED_USERS: SeedUser[] = [
  {
    username: 'admin',
    email: 'admin@normi.edu.ph',
    password: 'AdminPassword123!',
    role: Role.ADMIN,
    isActive: true,
    isApproved: true,
    permissions: {
      dashboard: true,
      employees: true,
      attendance: true,
      payroll: true,
      leaves: true,
      talentAcquisition: true,
      aiSearch: true,
      reports: true,
    },
  },
  {
    username: 'hr_personnel',
    email: 'hr@normi.edu.ph',
    password: 'HrPassword123!',
    role: Role.HR,
    isActive: true,
    isApproved: true,
    permissions: {
      dashboard: true,
      employees: true,
      attendance: true,
      payroll: true,
      leaves: true,
      talentAcquisition: true,
      aiSearch: false,
      reports: false,
    },
  },
  {
    username: 'juan_delacruz',
    email: 'juan.delacruz@normi.edu.ph',
    password: 'juan.delacruz@normi.edu.ph',
    role: Role.EMPLOYEE,
    isActive: true,
    isApproved: true,
    employeeId: 'EMP001',
    permissions: {
      dashboard: false,
      employees: false,
      attendance: true,
      payroll: true,
      leaves: true,
      talentAcquisition: false,
      aiSearch: false,
      reports: false,
    },
  },
  {
    username: 'maria_clara',
    email: 'maria.clara@normi.edu.ph',
    password: 'ClaraPassword123!',
    role: Role.HR,
    isActive: true,
    isApproved: false,
    permissions: {
      dashboard: true,
      employees: true,
      attendance: false,
      payroll: false,
      leaves: false,
      talentAcquisition: true,
      aiSearch: false,
      reports: false,
    },
  },
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function seedDepartments(): Promise<Map<string, string>> {
  const departmentIds = new Map<string, string>();

  for (const name of DEPARTMENTS) {
    const department = await prisma.department.upsert({
      where: { name },
      update: { isActive: true },
      create: { name },
    });
    departmentIds.set(name, department.id);
  }

  console.log(`  ✓ ${DEPARTMENTS.length} departments`);
  return departmentIds;
}

async function seedDocumentTypes(): Promise<void> {
  for (const category of DOCUMENT_CATEGORIES) {
    await prisma.documentCategory.upsert({
      where: { id: category.id },
      update: {
        title: category.title,
        sortOrder: category.sortOrder,
      },
      create: {
        id: category.id,
        title: category.title,
        sortOrder: category.sortOrder,
      },
    });

    for (const [index, name] of category.items.entries()) {
      await prisma.documentType.upsert({
        where: {
          categoryId_name: {
            categoryId: category.id,
            name,
          },
        },
        update: {
          sortOrder: index + 1,
          isRequired: true,
        },
        create: {
          categoryId: category.id,
          name,
          sortOrder: index + 1,
          isRequired: true,
        },
      });
    }
  }

  const totalTypes = DOCUMENT_CATEGORIES.reduce((sum, category) => sum + category.items.length, 0);
  console.log(`  ✓ ${DOCUMENT_CATEGORIES.length} document categories, ${totalTypes} document types`);
}

interface DemoEmpSeed {
  employeeNumber: string;
  surname: string;
  firstName: string;
  middleName?: string;
  dob: string;
  sex: Sex;
  maritalStatus: string;
  address: string;
  contact: string;
  email: string;
  departmentName: string;
  position: string;
  empDate: string;
  duration: string;
  education: string;
  degree: string;
}

const DEMO_EMPLOYEES: DemoEmpSeed[] = [
  {
    employeeNumber: 'EMP001',
    surname: 'Dela Cruz',
    firstName: 'Juan',
    middleName: 'Santos',
    dob: '1985-03-15',
    sex: Sex.MALE,
    maritalStatus: 'Married',
    address: 'Cagayan de Oro City, Misamis Oriental',
    contact: '09171234567',
    email: 'juan.delacruz@normi.edu.ph',
    departmentName: 'MIS',
    position: 'Instructor',
    empDate: '2010-06-01',
    duration: '16 Years',
    education: "Master's Degree",
    degree: 'BS Information Technology',
  },
  {
    employeeNumber: 'EMP002',
    surname: 'Santos',
    firstName: 'Maria Clara',
    middleName: 'Reyes',
    dob: '1988-07-22',
    sex: Sex.FEMALE,
    maritalStatus: 'Single',
    address: 'Gingoog City, Misamis Oriental',
    contact: '09182345678',
    email: 'maria.santos@normi.edu.ph',
    departmentName: 'CIT',
    position: 'Assistant Professor',
    empDate: '2015-08-15',
    duration: '11 Years',
    education: "Master's Degree",
    degree: 'BS Computer Engineering',
  },
  {
    employeeNumber: 'EMP003',
    surname: 'Lim',
    firstName: 'Roberto',
    middleName: 'Tan',
    dob: '1982-11-05',
    sex: Sex.MALE,
    maritalStatus: 'Married',
    address: 'Medina, Misamis Oriental',
    contact: '09193456789',
    email: 'roberto.lim@normi.edu.ph',
    departmentName: 'CBA',
    position: 'Senior Lecturer',
    empDate: '2018-01-10',
    duration: '8 Years',
    education: 'Doctorate Degree',
    degree: 'BS Business Administration',
  },
  {
    employeeNumber: 'EMP004',
    surname: 'Ramos',
    firstName: 'Elena',
    middleName: 'Cruz',
    dob: '1992-04-18',
    sex: Sex.FEMALE,
    maritalStatus: 'Single',
    address: 'Balingasag, Misamis Oriental',
    contact: '09204567890',
    email: 'elena.ramos@normi.edu.ph',
    departmentName: 'Quality Assurance Office',
    position: 'QA Analyst',
    empDate: '2021-03-01',
    duration: '5 Years',
    education: "Master's Degree",
    degree: 'BS Industrial Engineering',
  },
  {
    employeeNumber: 'EMP005',
    surname: 'Cruz',
    firstName: 'David',
    middleName: 'Bautista',
    dob: '1995-09-30',
    sex: Sex.MALE,
    maritalStatus: 'Single',
    address: 'Cagayan de Oro City',
    contact: '09215678901',
    email: 'david.cruz@normi.edu.ph',
    departmentName: 'Accounting /Finance Department',
    position: 'Finance Officer',
    empDate: '2023-06-15',
    duration: '3 Years',
    education: "Bachelor's Degree",
    degree: 'BS Accountancy',
  },
  {
    employeeNumber: 'EMP006',
    surname: 'Tan',
    firstName: 'Grace',
    middleName: 'Uy',
    dob: '1990-12-12',
    sex: Sex.FEMALE,
    maritalStatus: 'Married',
    address: 'El Salvador City',
    contact: '09226789012',
    email: 'grace.tan@normi.edu.ph',
    departmentName: 'CEAS',
    position: 'Secondary Education Head',
    empDate: '2016-09-01',
    duration: '10 Years',
    education: "Master's Degree",
    degree: 'BSEd English',
  },
];

async function seedDemoEmployees(departmentIds: Map<string, string>): Promise<void> {
  for (const item of DEMO_EMPLOYEES) {
    const deptId = departmentIds.get(item.departmentName) || departmentIds.get('MIS')!;

    await prisma.employee.upsert({
      where: { employeeNumber: item.employeeNumber },
      update: {
        surname: item.surname,
        firstName: item.firstName,
        middleName: item.middleName || null,
        dateOfBirth: new Date(item.dob),
        sex: item.sex,
        maritalStatus: item.maritalStatus,
        religion: 'Roman Catholic',
        homeAddress: item.address,
        contactNumber: item.contact,
        email: item.email,
        departmentId: deptId,
        position: item.position,
        employmentDate: new Date(item.empDate),
        serviceDuration: item.duration,
        status: EmployeeStatus.ACTIVE,
        educationLevel: item.education,
        bachelorsDegree: item.degree,
        functionalRate: 1500,
        gasolineAllowance: 1000,
        cashAdvanceBalance: 0,
        employeeShare: 1200,
      },
      create: {
        employeeNumber: item.employeeNumber,
        surname: item.surname,
        firstName: item.firstName,
        middleName: item.middleName || null,
        dateOfBirth: new Date(item.dob),
        sex: item.sex,
        maritalStatus: item.maritalStatus,
        religion: 'Roman Catholic',
        homeAddress: item.address,
        contactNumber: item.contact,
        email: item.email,
        departmentId: deptId,
        position: item.position,
        employmentDate: new Date(item.empDate),
        serviceDuration: item.duration,
        status: EmployeeStatus.ACTIVE,
        educationLevel: item.education,
        bachelorsDegree: item.degree,
        functionalRate: 1500,
        gasolineAllowance: 1000,
        cashAdvanceBalance: 0,
        employeeShare: 1200,
      },
    });
  }

  console.log(`  ✓ ${DEMO_EMPLOYEES.length} demo employees seeded`);
}

async function seedDemoAttendance(): Promise<void> {
  const employees = await prisma.employee.findMany({ select: { id: true, employeeNumber: true } });
  if (employees.length === 0) return;

  const dates: Date[] = [];
  const baseDate = new Date('2026-10-01');
  for (let i = 1; i <= 20; i++) {
    const d = new Date(baseDate);
    d.setDate(i);
    // Skip weekends
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(d);
    }
  }

  let seededCount = 0;
  for (const emp of employees) {
    for (const [index, date] of dates.entries()) {
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      let timeIn = '07:55 AM';
      let remarks = 'Regular arrival';

      // Vary the statuses for realistic analytics
      if (emp.employeeNumber === 'EMP001') {
        if (index === 3) {
          status = AttendanceStatus.LATE;
          timeIn = '08:25 AM';
          remarks = 'Traffic delay along highway';
        }
      } else if (emp.employeeNumber === 'EMP002') {
        if (index === 5) {
          status = AttendanceStatus.ON_LEAVE;
          timeIn = '';
          remarks = 'Scheduled wellness leave';
        } else if (index === 10) {
          status = AttendanceStatus.LATE;
          timeIn = '08:15 AM';
          remarks = 'Advising student project';
        }
      } else if (emp.employeeNumber === 'EMP003') {
        if (index === 2) {
          status = AttendanceStatus.ABSENT;
          timeIn = '';
          remarks = 'Emergency absence';
        } else if (index === 8) {
          status = AttendanceStatus.LATE;
          timeIn = '08:30 AM';
          remarks = 'Weather advisory';
        }
      } else if (emp.employeeNumber === 'EMP004') {
        if (index === 7) {
          status = AttendanceStatus.LATE;
          timeIn = '08:12 AM';
          remarks = 'QA campus inspection';
        }
      }

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date,
          },
        },
        update: {
          status,
          timeIn: status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE ? timeIn : null,
          timeOut: status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE ? '05:00 PM' : null,
          remarks,
        },
        create: {
          employeeId: emp.id,
          date,
          status,
          timeIn: status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE ? timeIn : null,
          timeOut: status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE ? '05:00 PM' : null,
          remarks,
        },
      });
      seededCount++;
    }
  }

  console.log(`  ✓ ${seededCount} demo attendance records seeded`);
}

async function seedDemoPromotions(): Promise<void> {
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  const emp1 = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP001' } });
  const emp2 = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP002' } });
  const emp3 = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP003' } });

  if (!emp1 || !emp2 || !emp3) return;

  const promotionsData = [
    {
      id: 'promo-emp001-2026',
      employeeId: emp1.id,
      changeType: EmploymentChangeType.PROMOTION,
      effectiveDate: new Date('2026-11-15'),
      previousPosition: 'Instructor',
      newPosition: 'Lead Systems Architect & Tech Director',
      approvedById: adminUser?.id ?? null,
      remarks: '16 Years of service duration, completion of MS in Information Technology, and exemplary system architect contributions.',
    },
    {
      id: 'promo-emp002-2027',
      employeeId: emp2.id,
      changeType: EmploymentChangeType.PROMOTION,
      effectiveDate: new Date('2027-04-10'),
      previousPosition: 'Assistant Professor',
      newPosition: 'Quality Assurance Director',
      approvedById: adminUser?.id ?? null,
      remarks: 'Graduating status for Master of Business Administration credentials with 11 Years of outstanding operations loyalty.',
    },
    {
      id: 'promo-emp003-2026',
      employeeId: emp3.id,
      changeType: EmploymentChangeType.PROMOTION,
      effectiveDate: new Date('2026-12-01'),
      previousPosition: 'Senior Lecturer',
      newPosition: 'Associate Dean of Business Administration',
      approvedById: null, // Pending board review
      remarks: 'Active standard tenure overview. Recommended for high-level administrative assessment.',
    },
  ];

  for (const promo of promotionsData) {
    await prisma.employmentStatusChange.upsert({
      where: { id: promo.id },
      update: {
        changeType: promo.changeType,
        effectiveDate: promo.effectiveDate,
        previousPosition: promo.previousPosition,
        newPosition: promo.newPosition,
        approvedById: promo.approvedById,
        remarks: promo.remarks,
      },
      create: {
        id: promo.id,
        employeeId: promo.employeeId,
        changeType: promo.changeType,
        effectiveDate: promo.effectiveDate,
        previousPosition: promo.previousPosition,
        newPosition: promo.newPosition,
        approvedById: promo.approvedById,
        remarks: promo.remarks,
      },
    });
  }

  console.log('  ✓ 3 demo promotion records seeded');
}

async function seedUsers(): Promise<void> {
  for (const user of SEED_USERS) {
    const passwordHash = await hashPassword(user.password);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        passwordHash,
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved,
        permissions: permissionsToJson(user.permissions),
        employeeId: user.employeeId ?? null,
      },
      create: {
        username: user.username,
        email: user.email,
        passwordHash,
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved,
        permissions: permissionsToJson(user.permissions),
        employeeId: user.employeeId ?? null,
      },
    });

    console.log(`  ✓ user ${user.username} (${user.role})`);
  }
}

async function seedDemoPayroll(): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { employeeNumber: 'EMP001' },
  });
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!employee || !adminUser) return;

  // 1. Published June 2026 Run
  const publishedRun = await prisma.payrollRun.upsert({
    where: { id: 'seed-run-june-2026' },
    update: {
      name: 'June 2026 - Monthly',
      status: PayrollRunStatus.PUBLISHED,
      totalGross: 37000,
      totalDeductions: 5045,
      totalNet: 31955,
      publishedAt: new Date('2026-07-01'),
    },
    create: {
      id: 'seed-run-june-2026',
      name: 'June 2026 - Monthly',
      cutoffType: CutoffType.MONTHLY,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      status: PayrollRunStatus.PUBLISHED,
      totalGross: 37000,
      totalDeductions: 5045,
      totalNet: 31955,
      processedById: adminUser.id,
      publishedAt: new Date('2026-07-01'),
    },
  });

  await prisma.payrollRecord.upsert({
    where: {
      payrollRunId_employeeId: {
        payrollRunId: publishedRun.id,
        employeeId: employee.id,
      },
    },
    update: {
      status: PayrollRecordStatus.PUBLISHED,
      functionalRate: 1500,
      daysWorked: 22,
      basicSalary: 33000,
      allowances: 3000,
      gasoline: 1000,
      grossPay: 37000,
      tardinessMinutes: 0,
      tardinessDeduction: 0,
      sssDeduction: 1350,
      philHealthDeduction: 825,
      pagIbigDeduction: 200,
      taxWithheld: 2670,
      cashAdvance: 0,
      employeeShare: 2375,
      otherDeductions: 0,
      totalDeductions: 5045,
      netPay: 31955,
    },
    create: {
      payrollRunId: publishedRun.id,
      employeeId: employee.id,
      month: 'June',
      year: 2026,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      status: PayrollRecordStatus.PUBLISHED,
      functionalRate: 1500,
      daysWorked: 22,
      basicSalary: 33000,
      allowances: 3000,
      gasoline: 1000,
      grossPay: 37000,
      tardinessMinutes: 0,
      tardinessDeduction: 0,
      sssDeduction: 1350,
      philHealthDeduction: 825,
      pagIbigDeduction: 200,
      taxWithheld: 2670,
      cashAdvance: 0,
      employeeShare: 2375,
      otherDeductions: 0,
      totalDeductions: 5045,
      netPay: 31955,
      processedById: adminUser.id,
    },
  });

  // 2. Draft October 2026 Run
  await prisma.payrollRun.upsert({
    where: { id: 'seed-run-october-2026' },
    update: {
      name: 'October 2026 - Monthly',
      status: PayrollRunStatus.DRAFT,
    },
    create: {
      id: 'seed-run-october-2026',
      name: 'October 2026 - Monthly',
      cutoffType: CutoffType.MONTHLY,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-31'),
      status: PayrollRunStatus.DRAFT,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      processedById: adminUser.id,
    },
  });

  console.log('  ✓ demo payroll runs (June 2026 published, October 2026 draft)');
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  const departmentIds = await seedDepartments();
  await seedDocumentTypes();
  await seedDemoEmployees(departmentIds);
  await seedDemoAttendance();
  await seedDemoPromotions();
  await seedUsers();
  await seedDemoPayroll();

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
