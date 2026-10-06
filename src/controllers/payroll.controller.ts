import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import * as payrollService from '../services/payroll.service.js';
import type {
  AdjustPayrollRecordInput,
  CreatePayrollRunInput,
} from '../validators/payroll.validator.js';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
  return req.user;
}

function getIdParam(req: Request): string {
  const id = req.params.id;
  if (!id || typeof id !== 'string') {
    throw new AppError(400, 'Invalid or missing ID parameter', 'VALIDATION_ERROR');
  }
  return id;
}

export async function listPayrollRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const runs = await payrollService.listPayrollRuns(user.id);
    res.status(200).json({
      success: true,
      data: { runs },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPayrollRunById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const id = getIdParam(req);
    const run = await payrollService.getPayrollRunById(id, user.id);
    res.status(200).json({
      success: true,
      data: { run },
    });
  } catch (error) {
    next(error);
  }
}

export async function createPayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const run = await payrollService.createPayrollRun({
      input: req.body as CreatePayrollRunInput,
      actorUserId: user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });
    res.status(201).json({
      success: true,
      data: { run },
      message: 'Payroll run created successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function lockAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const id = getIdParam(req);
    const run = await payrollService.lockAttendance(
      id,
      user.id,
      req.ip ? req.ip : undefined
    );
    res.status(200).json({
      success: true,
      data: { run },
      message: 'Attendance locked for pay period',
    });
  } catch (error) {
    next(error);
  }
}

export async function unlockAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const id = getIdParam(req);
    const run = await payrollService.unlockAttendance(
      id,
      user.id,
      req.ip ? req.ip : undefined
    );
    res.status(200).json({
      success: true,
      data: { run },
      message: 'Attendance unlocked for pay period',
    });
  } catch (error) {
    next(error);
  }
}

export async function calculatePayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const id = getIdParam(req);
    const result = await payrollService.calculatePayrollRun(
      id,
      user.id,
      req.ip ? req.ip : undefined
    );
    res.status(200).json({
      success: true,
      data: result,
      message: 'Payroll calculated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function publishPayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const id = getIdParam(req);
    const run = await payrollService.publishPayrollRun(
      id,
      user.id,
      req.ip ? req.ip : undefined
    );
    res.status(200).json({
      success: true,
      data: { run },
      message: 'Payroll run published successfully. Payslips are now available to employees.',
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const id = getIdParam(req);
    const result = await payrollService.deletePayrollRun(
      id,
      user.id,
      req.ip ? req.ip : undefined
    );
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

export async function listPayrollRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const payrollRunId = req.query.payrollRunId ? String(req.query.payrollRunId) : undefined;
    const month = req.query.month ? String(req.query.month) : undefined;
    const yearParsed = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const year = yearParsed && !Number.isNaN(yearParsed) ? yearParsed : undefined;

    const records = await payrollService.listPayrollRecords({
      actorUserId: user.id,
      payrollRunId,
      month,
      year,
    });
    res.status(200).json({
      success: true,
      data: { records },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPayrollRecordById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const id = getIdParam(req);
    const record = await payrollService.getPayrollRecordById(id, user.id);
    res.status(200).json({
      success: true,
      data: { record },
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustPayrollRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const id = getIdParam(req);
    const record = await payrollService.adjustPayrollRecord({
      id,
      input: req.body as AdjustPayrollRecordInput,
      actorUserId: user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });
    res.status(200).json({
      success: true,
      data: { record },
      message: 'Payroll record adjusted successfully',
    });
  } catch (error) {
    next(error);
  }
}
