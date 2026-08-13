import type { NextFunction, Request, Response } from 'express';
import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as leaveService from '../services/leave.service.js';
import type { CreateLeaveInput } from '../validators/leave.validator.js';

export async function listLeaves(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const records = await leaveService.listLeaves(req.user.id);
    res.status(200).json({
      success: true,
      data: { records },
    });
  } catch (error) {
    next(error);
  }
}

export async function createLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const record = await leaveService.createLeave({
      input: req.body as CreateLeaveInput,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(201).json({
      success: true,
      data: { record },
      message: 'Leave request submitted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const leaveId = String(req.params.id ?? '').trim();
    if (!leaveId) {
      throw new AppError(400, 'Leave record ID is required', 'VALIDATION_ERROR');
    }

    const result = await leaveService.deleteLeave({
      leaveId,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Leave record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const leaveId = String(req.params.id ?? '').trim();
    if (!leaveId) {
      throw new AppError(400, 'Leave record ID is required', 'VALIDATION_ERROR');
    }

    const record = await leaveService.rejectLeave({
      leaveId,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { record },
      message: 'Leave request rejected',
    });
  } catch (error) {
    next(error);
  }
}

export async function approveLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const leaveId = String(req.params.id ?? '').trim();
    if (!leaveId) {
      throw new AppError(400, 'Leave record ID is required', 'VALIDATION_ERROR');
    }

    const record = await leaveService.approveLeave({
      leaveId,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { record },
      message: 'Leave request approved',
    });
  } catch (error) {
    next(error);
  }
}
