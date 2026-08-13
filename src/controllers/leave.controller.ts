import type { NextFunction, Request, Response } from 'express';
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
