import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { cleanupStagedUploads } from './upload.middleware.js';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Memory uploads — no local files; kept for API compatibility.
  void cleanupStagedUploads(req);

  if (error instanceof MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 5MB per file.'
        : error.message;
    res.status(400).json({
      success: false,
      error: {
        message,
        code: 'UPLOAD_ERROR',
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code ?? 'APP_ERROR',
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: error.issues.map((issue) => issue.message).join(', '),
        code: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid JSON body',
        code: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  console.error('Unhandled error:', error);

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
