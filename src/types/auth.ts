import type { Prisma, Role } from '../generated/prisma/index.js';

export interface UserPermissions {
  dashboard: boolean;
  employees: boolean;
  attendance: boolean;
  payroll: boolean;
  leaves: boolean;
  talentAcquisition: boolean;
  aiSearch: boolean;
  reports: boolean;
  feedback?: boolean;
}

export function permissionsToJson(permissions: UserPermissions): Prisma.InputJsonValue {
  return permissions as unknown as Prisma.InputJsonValue;
}

const PERMISSION_KEYS: (keyof UserPermissions)[] = [
  'dashboard',
  'employees',
  'attendance',
  'payroll',
  'leaves',
  'talentAcquisition',
  'aiSearch',
  'reports',
];

function parseUserPermissions(value: Prisma.JsonValue): UserPermissions | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (!PERMISSION_KEYS.every((key) => typeof record[key] === 'boolean')) {
    return null;
  }

  const permissions: UserPermissions = {
    dashboard: record.dashboard as boolean,
    employees: record.employees as boolean,
    attendance: record.attendance as boolean,
    payroll: record.payroll as boolean,
    leaves: record.leaves as boolean,
    talentAcquisition: record.talentAcquisition as boolean,
    aiSearch: record.aiSearch as boolean,
    reports: record.reports as boolean,
  };

  if (typeof record.feedback === 'boolean') {
    permissions.feedback = record.feedback;
  }

  return permissions;
}

export function permissionsFromJson(value: Prisma.JsonValue | null): UserPermissions | null {
  if (value === null) {
    return null;
  }

  return parseUserPermissions(value);
}

/** Public user profile returned by auth endpoints (never includes passwordHash). */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  isApproved: boolean;
  permissions: UserPermissions | null;
  employeeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
