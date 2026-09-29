import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as auditRepository from '../repositories/audit.repository.js';
import * as refreshTokenRepository from '../repositories/refreshToken.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { toAuthUser } from './auth.service.js';
import { permissionsToJson, type UserPermissions } from '../types/auth.js';
import { hashPassword } from '../utils/crypto.js';
import type {
  CreateStaffUserInput,
  UpdateUserPermissionsInput,
  UpdateUserPasswordInput,
  UpdateUserStatusInput,
} from '../validators/user.validator.js';

const FULL_ACCESS: UserPermissions = {
  dashboard: true,
  employees: true,
  attendance: true,
  payroll: true,
  leaves: true,
  talentAcquisition: true,
  aiSearch: true,
  reports: true,
};

const DEFAULT_HR_ACCESS: UserPermissions = {
  dashboard: true,
  employees: true,
  attendance: true,
  payroll: false,
  leaves: true,
  talentAcquisition: true,
  aiSearch: false,
  reports: false,
};

async function requireAdminActor(actorUserId: string) {
  const actor = await userRepository.findById(actorUserId);
  if (!actor) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (actor.role !== Role.ADMIN) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  return actor;
}

function requireUserId(userId: string) {
  const id = userId.trim();
  if (!id) {
    throw new AppError(400, 'User ID is required', 'VALIDATION_ERROR');
  }
  return id;
}

function toStoredPermissions(permissions: UserPermissions): UserPermissions {
  const stored: UserPermissions = {
    dashboard: permissions.dashboard,
    employees: permissions.employees,
    attendance: permissions.attendance,
    payroll: permissions.payroll,
    leaves: permissions.leaves,
    talentAcquisition: permissions.talentAcquisition,
    aiSearch: permissions.aiSearch,
    reports: permissions.reports,
  };

  if (typeof permissions.feedback === 'boolean') {
    stored.feedback = permissions.feedback;
  }

  return stored;
}

function resolveCreatePermissions(input: CreateStaffUserInput): UserPermissions {
  if (input.role === 'ADMIN') {
    return FULL_ACCESS;
  }

  const source = input.permissions;
  if (!source) {
    return DEFAULT_HR_ACCESS;
  }

  return toStoredPermissions({
    dashboard: source.dashboard,
    employees: source.employees,
    attendance: source.attendance,
    payroll: source.payroll,
    leaves: source.leaves,
    talentAcquisition: source.talentAcquisition,
    aiSearch: source.aiSearch,
    reports: source.reports,
  });
}

export async function listUsers(actorUserId: string) {
  await requireAdminActor(actorUserId);
  const users = await userRepository.listUsers();
  return users.map(toAuthUser);
}

export async function listAuditLogs(actorUserId: string) {
  await requireAdminActor(actorUserId);
  const logs = await auditRepository.listAuditLogs();
  return logs.map((log) => ({
    id: log.id,
    userId: log.userId ?? '',
    username: log.username,
    action: log.action,
    details: log.details ?? '',
    timestamp: log.createdAt.getTime(),
  }));
}

export async function createStaffUser(params: {
  input: CreateStaffUserInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const actor = await requireAdminActor(params.actorUserId);
  const username = params.input.username.trim();
  const email = params.input.email.trim().toLowerCase();

  const conflicts = await userRepository.listConflictingLogins({
    emails: [email],
    usernames: [username],
    employeeIds: [],
  });

  if (conflicts.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    throw new AppError(409, 'Username already exists', 'USERNAME_TAKEN');
  }

  if (conflicts.some((user) => user.email.toLowerCase() === email)) {
    throw new AppError(409, 'Email already exists', 'EMAIL_TAKEN');
  }

  const role = params.input.role === 'ADMIN' ? Role.ADMIN : Role.HR;
  const permissions = resolveCreatePermissions(params.input);
  const created = await userRepository.createStaffUser({
    username,
    email,
    passwordHash: await hashPassword(params.input.password),
    role,
    permissions: permissionsToJson(permissions),
    audit: {
      userId: actor.id,
      username: actor.username,
      action: 'Created system user',
      details: `${username} (${role})`,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    },
  });

  return toAuthUser(created);
}

export async function approveUser(params: {
  userId: string;
  actorUserId: string;
  ipAddress?: string;
}) {
  const actor = await requireAdminActor(params.actorUserId);
  const targetId = requireUserId(params.userId);
  const existing = await userRepository.findById(targetId);
  if (!existing) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (existing.isApproved) {
    throw new AppError(400, 'User is already approved', 'ALREADY_APPROVED');
  }

  const permissions = existing.permissions ? undefined : permissionsToJson(DEFAULT_HR_ACCESS);
  const updated = await userRepository.updateUserRecord({
    id: existing.id,
    data: {
      isApproved: true,
      ...(permissions ? { permissions } : {}),
    },
    audit: {
      userId: actor.id,
      username: actor.username,
      action: 'Approved user register request',
      details: existing.username,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    },
  });

  return toAuthUser(updated);
}

export async function updateUserStatus(params: {
  userId: string;
  input: UpdateUserStatusInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const actor = await requireAdminActor(params.actorUserId);
  const targetId = requireUserId(params.userId);
  const existing = await userRepository.findById(targetId);
  if (!existing) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (existing.id === actor.id) {
    throw new AppError(400, 'You cannot change your own account status', 'CANNOT_MODIFY_SELF');
  }

  if (
    existing.role === Role.ADMIN &&
    existing.isApproved &&
    existing.isActive &&
    params.input.isActive === false
  ) {
    const activeAdmins = await userRepository.countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AppError(400, 'Cannot suspend the last active administrator', 'LAST_ADMIN');
    }
  }

  const updated = await userRepository.updateUserRecord({
    id: existing.id,
    data: { isActive: params.input.isActive },
    audit: {
      userId: actor.id,
      username: actor.username,
      action: params.input.isActive ? 'Activated user' : 'Suspended user',
      details: existing.username,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    },
  });

  return toAuthUser(updated);
}

export async function updateUserPermissions(params: {
  userId: string;
  input: UpdateUserPermissionsInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const actor = await requireAdminActor(params.actorUserId);
  const targetId = requireUserId(params.userId);
  const existing = await userRepository.findById(targetId);
  if (!existing) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (existing.role === Role.ADMIN) {
    throw new AppError(400, 'Administrator access cannot be limited', 'ADMIN_PERMISSIONS_LOCKED');
  }

  const updated = await userRepository.updateUserRecord({
    id: existing.id,
    data: {
      permissions: permissionsToJson(
        toStoredPermissions({
          dashboard: params.input.permissions.dashboard,
          employees: params.input.permissions.employees,
          attendance: params.input.permissions.attendance,
          payroll: params.input.permissions.payroll,
          leaves: params.input.permissions.leaves,
          talentAcquisition: params.input.permissions.talentAcquisition,
          aiSearch: params.input.permissions.aiSearch,
          reports: params.input.permissions.reports,
        }),
      ),
    },
    audit: {
      userId: actor.id,
      username: actor.username,
      action: 'Updated access rule limits',
      details: existing.username,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    },
  });

  return toAuthUser(updated);
}

export async function updateUserPassword(params: {
  userId: string;
  input: UpdateUserPasswordInput;
  actorUserId: string;
  ipAddress?: string;
}) {
  const actor = await requireAdminActor(params.actorUserId);
  const targetId = requireUserId(params.userId);
  const existing = await userRepository.findById(targetId);
  if (!existing) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (existing.id === actor.id) {
    throw new AppError(400, 'Use Change Password for your own account', 'CANNOT_MODIFY_SELF');
  }

  if (existing.role !== Role.HR && existing.role !== Role.EMPLOYEE) {
    throw new AppError(400, 'Only HR and employee passwords can be reset by an administrator', 'ADMIN_PASSWORD_LOCKED');
  }

  const updated = await userRepository.updateUserRecord({
    id: existing.id,
    data: { passwordHash: await hashPassword(params.input.password) },
    audit: {
      userId: actor.id,
      username: actor.username,
      action: 'Reset user password',
      details: existing.username,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    },
  });

  await refreshTokenRepository.revokeAllUserRefreshTokens(existing.id);

  return toAuthUser(updated);
}

export async function deleteUser(params: {
  userId: string;
  actorUserId: string;
  ipAddress?: string;
}) {
  const actor = await requireAdminActor(params.actorUserId);
  const targetId = requireUserId(params.userId);
  const existing = await userRepository.findById(targetId);
  if (!existing) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (existing.id === actor.id) {
    throw new AppError(400, 'You cannot delete your own account', 'CANNOT_MODIFY_SELF');
  }

  if (existing.role === Role.ADMIN && existing.isApproved && existing.isActive) {
    const activeAdmins = await userRepository.countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AppError(400, 'Cannot delete the last active administrator', 'LAST_ADMIN');
    }
  }

  const action = existing.isApproved ? 'Deleted user account' : 'Declined and deleted registration';

  await userRepository.deleteUserRecord({
    id: existing.id,
    audit: {
      userId: actor.id,
      username: actor.username,
      action,
      details: existing.username,
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    },
  });

  return { id: existing.id };
}
