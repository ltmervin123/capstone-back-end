import multer from 'multer';
import type { Request, RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

/** Keep files in memory only — never write to local disk. */
export const employeeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 40,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, `Unsupported file type: ${file.mimetype}`, 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

export const employeeCreateUpload: RequestHandler = employeeUpload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'documents', maxCount: 40 },
]);

/**
 * No-op: memory uploads have no local files to clean.
 * Kept so errorHandler call sites stay stable.
 */
export async function cleanupStagedUploads(_req: Request): Promise<void> {
  // Memory storage — nothing on disk
}

/** @deprecated Use cleanupStagedUploads */
export const cleanupUploadedFiles = cleanupStagedUploads;
