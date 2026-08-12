import { Readable } from 'node:stream';
import { AppError } from '../errors/AppError.js';
import { cloudinary } from '../lib/cloudinary.js';
import { sanitizeEmployeeFolder, sanitizeFileName } from './fileStorage.js';

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  resourceType: string;
};

function employeeCloudFolder(employeeNumber: string, ...segments: string[]): string {
  const safeId = sanitizeEmployeeFolder(employeeNumber);
  const safeSegments = segments.map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '_'));
  return ['nmc-hr', 'employees', safeId, ...safeSegments].join('/');
}

export function employeeProfileCloudFolder(employeeNumber: string): string {
  return employeeCloudFolder(employeeNumber, 'profile');
}

export function employeeDocumentCloudFolder(employeeNumber: string, categoryId: string): string {
  return employeeCloudFolder(employeeNumber, 'documents', categoryId);
}

function toCloudinaryAppError(error: unknown): AppError {
  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message
      : 'Cloudinary upload failed';

  return new AppError(502, message, 'CLOUDINARY_UPLOAD_FAILED');
}

/**
 * Uploads an in-memory multer file buffer directly to Cloudinary (no local disk write).
 */
export async function uploadBufferToCloudinary(params: {
  buffer: Buffer;
  folder: string;
  originalName: string;
}): Promise<CloudinaryUploadResult> {
  const publicIdBase = sanitizeFileName(params.originalName).replace(/\.[^.]+$/, '');

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: params.folder,
        ...(publicIdBase ? { public_id: publicIdBase } : {}),
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(toCloudinaryAppError(error ?? new Error('Cloudinary upload failed')));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      },
    );

    Readable.from(params.buffer).pipe(upload);
  });
}

export async function destroyCloudinaryUploads(
  uploads: Array<Pick<CloudinaryUploadResult, 'publicId' | 'resourceType'>>,
): Promise<void> {
  await Promise.all(
    uploads.map(async (upload) => {
      try {
        const resourceType =
          upload.resourceType === 'video' || upload.resourceType === 'raw'
            ? upload.resourceType
            : 'image';
        await cloudinary.uploader.destroy(upload.publicId, {
          resource_type: resourceType,
          invalidate: true,
        });
      } catch {
        // Best-effort rollback cleanup
      }
    }),
  );
}
