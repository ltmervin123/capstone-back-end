import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import type { ReportFilterParams } from '../repositories/report.repository.js';
import * as reportService from '../services/report.service.js';

function parseFilterParams(req: Request): ReportFilterParams {
  const { departmentId, startDate, endDate, search } = req.query;

  const result: ReportFilterParams = {};
  if (typeof departmentId === 'string' && departmentId) {
    result.departmentId = departmentId;
  }
  if (typeof startDate === 'string' && startDate) {
    result.startDate = new Date(startDate);
  }
  if (typeof endDate === 'string' && endDate) {
    result.endDate = new Date(endDate);
  }
  if (typeof search === 'string' && search) {
    result.search = search;
  }
  return result;
}

export async function getEmploymentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const filters = parseFilterParams(req);
    const data = await reportService.getEmploymentReport(req.user.id, filters);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPromotionReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const filters = parseFilterParams(req);
    const data = await reportService.getPromotionReport(req.user.id, filters);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const filters = parseFilterParams(req);
    const data = await reportService.getAttendanceReport(req.user.id, filters);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getReportFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const data = await reportService.getReportFilters(req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
