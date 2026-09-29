import type { NextFunction, Request, Response } from 'express';
import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as userService from '../services/user.service.js';
import type {
  CreateStaffUserInput,
  UpdateUserPermissionsInput,
  UpdateUserPasswordInput,
  UpdateUserStatusInput,
} from '../validators/user.validator.js';

function requireAdminUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (req.user.role !== Role.ADMIN) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  return req.user;
}

function requireTargetUserId(req: Request) {
  const userId = String(req.params.id ?? '').trim();
  if (!userId) {
    throw new AppError(400, 'User ID is required', 'VALIDATION_ERROR');
  }
  return userId;
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAdminUser(req);
    const users = await userService.listUsers(actor.id);
    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAdminUser(req);
    const logs = await userService.listAuditLogs(actor.id);
    res.status(200).json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
}

export async function createStaffUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAdminUser(req);
    const user = await userService.createStaffUser({
      input: req.body as CreateStaffUserInput,
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(201).json({
      success: true,
      data: { user },
      message: 'User created successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAdminUser(req);
    const user = await userService.approveUser({
      userId: requireTargetUserId(req),
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { user },
      message: 'User approved successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAdminUser(req);
    const user = await userService.updateUserStatus({
      userId: requireTargetUserId(req),
      input: req.body as UpdateUserStatusInput,
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { user },
      message: 'User status updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAdminUser(req);
    const user = await userService.updateUserPermissions({
      userId: requireTargetUserId(req),
      input: req.body as UpdateUserPermissionsInput,
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { user },
      message: 'User permissions updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAdminUser(req);
    const user = await userService.updateUserPassword({
      userId: requireTargetUserId(req),
      input: req.body as UpdateUserPasswordInput,
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { user },
      message: 'User password updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAdminUser(req);
    const result = await userService.deleteUser({
      userId: requireTargetUserId(req),
      actorUserId: actor.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
