import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import type { Request, RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import { ensureDir, STAGING_ROOT, uniqueFileName } from '../utils/fileStorage.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureDir(STAGING_ROOT);
      cb(null, STAGING_ROOT);
    } catch (error) {
      cb(error as Error, STAGING_ROOT);
    }
  },
  filename: (_req, file, cb) => {
    cb(null, uniqueFileName(file.originalname));
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export const employeeUpload = multer({
  storage,
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
 * Removes staged multer files that were never persisted.
 * Safe after success: moved files are already gone from staging paths.
 */
export async function cleanupStagedUploads(req: Request): Promise<void> {
  const files = req.files;
  if (!files || typeof files !== 'object' || Array.isArray(files)) {
    return;
  }

  const stagingRoot = path.resolve(STAGING_ROOT);
  const uploaded = Object.values(files).flat();

  await Promise.all(
    uploaded.map(async (file) => {
      if (!file?.path) return;
      const resolved = path.resolve(file.path);
      if (!resolved.startsWith(stagingRoot)) {
        return;
      }
      try {
        await fs.promises.unlink(resolved);
      } catch {
        // Ignore missing/already-moved files
      }
    }),
  );
}

/** @deprecated Use cleanupStagedUploads */
export const cleanupUploadedFiles = cleanupStagedUploads;
