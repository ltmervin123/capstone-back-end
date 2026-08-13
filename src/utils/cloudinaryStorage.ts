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

export function employeeRootCloudFolder(employeeNumber: string): string {
  return employeeCloudFolder(employeeNumber);
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

const CLOUDINARY_RESOURCE_TYPES = ['image', 'raw', 'video'] as const;

function preferredResourceType(resourceType: string): (typeof CLOUDINARY_RESOURCE_TYPES)[number] {
  if (resourceType === 'video' || resourceType === 'raw' || resourceType === 'image') {
    return resourceType;
  }
  return 'image';
}

/**
 * Derives Cloudinary public_id + resource_type from a secure_url stored in the DB.
 * Example: https://res.cloudinary.com/{cloud}/image/upload/v123/nmc-hr/employees/EMP-001/profile/photo.jpg
 */
export function parseCloudinaryAssetFromUrl(
  url: string,
): Pick<CloudinaryUploadResult, 'publicId' | 'resourceType'> | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('res.cloudinary.com') && !parsed.hostname.includes('cloudinary.com')) {
      return null;
    }

    const parts = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.findIndex(
      (segment) => segment === 'upload' || segment === 'authenticated' || segment === 'private',
    );
    if (uploadIndex < 1) {
      return null;
    }

    const resourceType = parts[uploadIndex - 1] ?? 'image';
    const afterUpload = parts.slice(uploadIndex + 1);
    let start = 0;
    while (start < afterUpload.length) {
      const segment = afterUpload[start]!;
      if (/^v\d+$/.test(segment)) {
        start += 1;
        break;
      }
      if (segment.includes(',') || /^(c_|w_|h_|f_|q_|fl_|t_|e_|b_|dpr_|ar_)/.test(segment)) {
        start += 1;
        continue;
      }
      break;
    }

    const publicIdWithExt = afterUpload.slice(start).join('/');
    if (!publicIdWithExt) {
      return null;
    }

    const publicId = publicIdWithExt.includes('.')
      ? publicIdWithExt.replace(/\.[^/.]+$/, '')
      : publicIdWithExt;

    return { publicId, resourceType };
  } catch {
    return null;
  }
}

export async function destroyCloudinaryUploads(
  uploads: Array<Pick<CloudinaryUploadResult, 'publicId' | 'resourceType'>>,
): Promise<void> {
  await Promise.all(
    uploads.map(async (upload) => {
      const preferred = preferredResourceType(upload.resourceType);
      const order = [preferred, ...CLOUDINARY_RESOURCE_TYPES.filter((type) => type !== preferred)];

      for (const resourceType of order) {
        try {
          const result = await cloudinary.uploader.destroy(upload.publicId, {
            resource_type: resourceType,
            invalidate: true,
          });
          if (result?.result === 'ok') {
            return;
          }
        } catch {
          // Try the next resource type
        }
      }
    }),
  );
}

export async function destroyCloudinaryUrls(urls: Array<string | null | undefined>): Promise<void> {
  const assets = urls
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
    .map(parseCloudinaryAssetFromUrl)
    .filter((asset): asset is NonNullable<typeof asset> => asset !== null);

  await destroyCloudinaryUploads(assets);
}

/**
 * Best-effort wipe of every Cloudinary asset under nmc-hr/employees/{EMPLOYEE_ID}/.
 */
export async function destroyEmployeeCloudFolder(employeeNumber: string): Promise<void> {
  const prefix = employeeRootCloudFolder(employeeNumber);

  await Promise.all(
    CLOUDINARY_RESOURCE_TYPES.map(async (resourceType) => {
      try {
        await cloudinary.api.delete_resources_by_prefix(prefix, {
          resource_type: resourceType,
          type: 'upload',
          invalidate: true,
        });
      } catch {
        // Best-effort folder cleanup
      }
    }),
  );

  try {
    await cloudinary.api.delete_folder(prefix);
  } catch {
    // Nested empty folders may remain; resources are already deleted
  }
}
