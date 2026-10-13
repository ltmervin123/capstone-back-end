import type { NextFunction, Request, Response } from 'express';
import type { Express } from 'express';
import { Role } from '../generated/prisma/index.js';
import { AppError } from '../errors/AppError.js';
import * as employeeService from '../services/employee.service.js';
import * as documentExtractionService from '../services/documentExtraction.service.js';
import {
  createEmployeeBodySchema,
  createPromotionSchema,
  documentLabelsSchema,
  removedDocumentsSchema,
  updateEmployeeBodySchema,
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

function parseJsonField(raw: unknown, fieldName: string): unknown {
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AppError(400, `Invalid ${fieldName} JSON`, 'VALIDATION_ERROR');
  }
}

function parseEmployeePayload(req: Request) {
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

  return parsedPayload;
}

function parseDocumentLabels(req: Request) {
  const rawLabels = req.body?.documentLabels;
  if (typeof rawLabels !== 'string' || !rawLabels.trim()) {
    return [] as ReturnType<typeof documentLabelsSchema.parse>;
  }

  try {
    return documentLabelsSchema.parse(JSON.parse(rawLabels) as unknown);
  } catch {
    throw new AppError(400, 'Invalid documentLabels JSON', 'VALIDATION_ERROR');
  }
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

    const input = createEmployeeBodySchema.parse(parseEmployeePayload(req));
    const documentLabels = parseDocumentLabels(req);

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

export async function updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const employeeNumber = String(req.params.employeeNumber ?? '')
      .trim()
      .toUpperCase();
    if (!employeeNumber) {
      throw new AppError(400, 'Employee ID is required', 'VALIDATION_ERROR');
    }

    const input = updateEmployeeBodySchema.parse(parseEmployeePayload(req));
    const documentLabels = parseDocumentLabels(req);

    let removedDocuments: ReturnType<typeof removedDocumentsSchema.parse> = [];
    const rawRemoved = parseJsonField(req.body?.removedDocuments, 'removedDocuments');
    if (rawRemoved !== undefined) {
      removedDocuments = removedDocumentsSchema.parse(rawRemoved);
    }

    const removeProfilePicture =
      req.body?.removeProfilePicture === 'true' || req.body?.removeProfilePicture === true;

    const employee = await employeeService.updateEmployee({
      employeeNumber,
      input,
      documentLabels,
      removedDocuments,
      removeProfilePicture,
      files: getUploadedFiles(req),
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: { employee },
      message: 'Employee updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const employeeNumber = String(req.params.employeeNumber ?? '')
      .trim()
      .toUpperCase();
    if (!employeeNumber) {
      throw new AppError(400, 'Employee ID is required', 'VALIDATION_ERROR');
    }

    const result = await employeeService.deleteEmployee({
      employeeNumber,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function extractEmployeeDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (req.user.role !== Role.ADMIN && req.user.role !== Role.HR) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    const file = req.file;
    if (!file) {
      throw new AppError(
        400,
        'Please upload a PDF document file under the "document" field.',
        'NO_FILE_UPLOADED'
      );
    }

    const extracted = await documentExtractionService.extractEmployeeFromPdf(
      file.buffer,
      file.originalname
    );

    res.status(200).json({
      success: true,
      data: extracted,
      message: 'Document analyzed and extracted successfully',
    });
  } catch (error) {
    next(error);
  }
}

function getParamString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export async function listEmployeePromotions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const employeeNumber = getParamString(req.params.employeeNumber);
    if (!employeeNumber) {
      throw new AppError(400, 'Employee number is required', 'VALIDATION_ERROR');
    }

    const promotions = await employeeService.getEmployeePromotions({
      employeeNumber,
      actorUserId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: promotions,
    });
  } catch (error) {
    next(error);
  }
}

export async function promoteEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const employeeNumber = getParamString(req.params.employeeNumber);
    if (!employeeNumber) {
      throw new AppError(400, 'Employee number is required', 'VALIDATION_ERROR');
    }

    let bodyData = req.body;
    if (req.body?.payload) {
      try {
        bodyData = JSON.parse(req.body.payload);
      } catch {
        // use req.body as is
      }
    }

    const validatedInput = createPromotionSchema.parse(bodyData);
    const documentFile = req.file;

    const promotion = await employeeService.promoteEmployee({
      employeeNumber,
      actorUserId: req.user.id,
      input: validatedInput,
      ...(documentFile ? { documentFile } : {}),
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(201).json({
      success: true,
      data: promotion,
      message: promotion.isApproved
        ? 'Employee promoted successfully'
        : 'Promotion recommendation submitted for review',
    });
  } catch (error) {
    next(error);
  }
}

export async function approvePromotion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const employeeNumber = getParamString(req.params.employeeNumber);
    const promotionId = getParamString(req.params.promotionId);
    if (!employeeNumber || !promotionId) {
      throw new AppError(400, 'Employee number and promotion ID are required', 'VALIDATION_ERROR');
    }

    const result = await employeeService.approvePromotion({
      employeeNumber,
      promotionId,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Promotion approved successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePendingPromotion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const employeeNumber = getParamString(req.params.employeeNumber);
    const promotionId = getParamString(req.params.promotionId);
    if (!employeeNumber || !promotionId) {
      throw new AppError(400, 'Employee number and promotion ID are required', 'VALIDATION_ERROR');
    }

    const result = await employeeService.deletePendingPromotion({
      employeeNumber,
      promotionId,
      actorUserId: req.user.id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Promotion recommendation discarded successfully',
    });
  } catch (error) {
    next(error);
  }
}
