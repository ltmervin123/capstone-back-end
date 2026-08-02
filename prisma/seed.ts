import { Role } from '../src/generated/prisma/index.js';
import { prisma } from '../src/lib/prisma.js';
import { permissionsToJson, type UserPermissions } from '../src/types/auth.js';
import bcrypt from 'bcryptjs';

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
      payroll: false,
      leaves: true,
      talentAcquisition: true,
      aiSearch: false,
      reports: false,
    },
  },
  {
    username: 'juan_delacruz',
    email: 'juan.delacruz@normi.edu.ph',
    password: 'EmpPassword123!',
    role: Role.EMPLOYEE,
    isActive: true,
    isApproved: true,
    employeeId: 'EMP001',
    permissions: {
      dashboard: true,
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

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

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

    console.log(`  ✓ ${user.username} (${user.role})`);
  }

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
