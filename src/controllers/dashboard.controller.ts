import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import * as dashboardService from '../services/dashboard.service.js';

function requireAuthenticatedUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  return req.user;
}

export async function getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = requireAuthenticatedUser(req);
    const summary = await dashboardService.getDashboardSummary(actor.id);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}
