import type { NextFunction, Request, Response } from 'express';
import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as dashboardService from '../services/dashboard.service.js';

function requireHrUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  return req.user;
}

export async function getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireHrUser(req);
    const summary = await dashboardService.getDashboardSummary(actor.id);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}
