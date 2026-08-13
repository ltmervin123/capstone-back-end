import type { NextFunction, Request, Response } from 'express';
import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as attendanceService from '../services/attendance.service.js';
import type { CreateAttendanceInput } from '../validators/attendance.validator.js';

export async function listAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const records = await attendanceService.listAttendance(req.user.id);
    res.status(200).json({
      success: true,
      data: { records },
    });
  } catch (error) {
    next(error);
  }
}

export async function createAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const record = await attendanceService.createAttendance({
      input: req.body as CreateAttendanceInput,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(201).json({
      success: true,
      data: { record },
      message: 'Attendance recorded successfully',
    });
  } catch (error) {
    next(error);
  }
}
