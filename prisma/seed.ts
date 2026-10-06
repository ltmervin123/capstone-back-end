import { CutoffType, EmployeeStatus, PayrollRecordStatus, PayrollRunStatus, Role, Sex } from '../src/generated/prisma/index.js';
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

async function seedDemoEmployee(departmentIds: Map<string, string>): Promise<void> {
  const misDepartmentId = departmentIds.get('MIS');
  if (!misDepartmentId) {
    throw new Error('MIS department not found during seed');
  }

  await prisma.employee.upsert({
    where: { employeeNumber: 'EMP001' },
    update: {
      surname: 'Dela Cruz',
      firstName: 'Juan',
      middleName: 'Santos',
      dateOfBirth: new Date('1985-03-15'),
      sex: Sex.MALE,
      maritalStatus: 'Married',
      religion: 'Roman Catholic',
      homeAddress: 'Cagayan de Oro City, Misamis Oriental',
      contactNumber: '09171234567',
      email: 'juan.delacruz@normi.edu.ph',
      departmentId: misDepartmentId,
      position: 'Instructor',
      employmentDate: new Date('2010-06-01'),
      serviceDuration: '16 Years',
      status: EmployeeStatus.ACTIVE,
      educationLevel: 'Master\'s Degree',
      bachelorsDegree: 'BS Information Technology',
      mastersStatus: 'Completed',
      mastersDegreeName: 'MS Information Technology',
      doctorateStatus: 'Ongoing',
      functionalRate: 1500,
      gasolineAllowance: 1000,
      cashAdvanceBalance: 0,
      employeeShare: 1200,
    },
    create: {
      employeeNumber: 'EMP001',
      surname: 'Dela Cruz',
      firstName: 'Juan',
      middleName: 'Santos',
      dateOfBirth: new Date('1985-03-15'),
      sex: Sex.MALE,
      maritalStatus: 'Married',
      religion: 'Roman Catholic',
      homeAddress: 'Cagayan de Oro City, Misamis Oriental',
      contactNumber: '09171234567',
      email: 'juan.delacruz@normi.edu.ph',
      departmentId: misDepartmentId,
      position: 'Instructor',
      employmentDate: new Date('2010-06-01'),
      serviceDuration: '16 Years',
      status: EmployeeStatus.ACTIVE,
      educationLevel: 'Master\'s Degree',
      bachelorsDegree: 'BS Information Technology',
      mastersStatus: 'Completed',
      mastersDegreeName: 'MS Information Technology',
      doctorateStatus: 'Ongoing',
      functionalRate: 1500,
      gasolineAllowance: 1000,
      cashAdvanceBalance: 0,
      employeeShare: 1200,
    },
  });

  console.log('  ✓ demo employee EMP001 (Juan Dela Cruz)');
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
  await seedDemoEmployee(departmentIds);
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
