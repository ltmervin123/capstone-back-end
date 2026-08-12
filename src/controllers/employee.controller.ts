import type { NextFunction, Request, Response } from 'express';
import type { Express } from 'express';
import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as employeeService from '../services/employee.service.js';
import {
  createEmployeeBodySchema,
  documentLabelsSchema,
} from '../validators/employee.validator.js';

function getUploadedFiles(req: Request): {
  profilePicture?: Express.Multer.File[];
  documents?: Express.Multer.File[];
} {
  const files = req.files;
  if (!files || typeof files !== 'object' || Array.isArray(files)) {
    return {};
  }

  const typed = files as {
    profilePicture?: Express.Multer.File[];
    documents?: Express.Multer.File[];
  };

  const result: {
    profilePicture?: Express.Multer.File[];
    documents?: Express.Multer.File[];
  } = {};

  if (typed.profilePicture) {
    result.profilePicture = typed.profilePicture;
  }
  if (typed.documents) {
    result.documents = typed.documents;
  }

  return result;
}

export async function listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const employees = await employeeService.listEmployees();
    res.status(200).json({
      success: true,
      data: { employees },
    });
  } catch (error) {
    next(error);
  }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const rawPayload = req.body?.payload ?? req.body?.data;
    if (typeof rawPayload !== 'string' || !rawPayload.trim()) {
      throw new AppError(
        400,
        'Missing employee payload. Send a multipart field named "payload" (JSON string).',
        'VALIDATION_ERROR',
      );
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(rawPayload) as unknown;
    } catch {
      throw new AppError(400, 'Invalid employee payload JSON', 'VALIDATION_ERROR');
    }

    const input = createEmployeeBodySchema.parse(parsedPayload);

    let documentLabels: ReturnType<typeof documentLabelsSchema.parse> = [];
    const rawLabels = req.body?.documentLabels;
    if (typeof rawLabels === 'string' && rawLabels.trim()) {
      try {
        documentLabels = documentLabelsSchema.parse(JSON.parse(rawLabels) as unknown);
      } catch {
        throw new AppError(400, 'Invalid documentLabels JSON', 'VALIDATION_ERROR');
      }
    }

    const employee = await employeeService.createEmployee({
      input,
      documentLabels,
      files: getUploadedFiles(req),
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(201).json({
      success: true,
      data: { employee },
      message: 'Employee created successfully',
    });
  } catch (error) {
    next(error);
  }
}
