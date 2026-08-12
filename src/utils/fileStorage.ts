import fs from 'node:fs';
import path from 'node:path';

/** Root folder for persisted employee uploads. */
export const ASSETS_ROOT = path.resolve(process.cwd(), 'assets');

/** Temporary landing zone for multer before files are organized per employee. */
export const STAGING_ROOT = path.join(ASSETS_ROOT, 'staging');

/** Public URL prefix served by Express. */
export const ASSETS_PUBLIC_PREFIX = '/api/assets';

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function sanitizeEmployeeFolder(employeeNumber: string): string {
  return employeeNumber.replace(/[^a-zA-Z0-9._-]/g, '_').toUpperCase();
}

export function sanitizeFileName(originalName: string): string {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function uniqueFileName(originalName: string): string {
  const safeName = sanitizeFileName(originalName);
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
}

/** Absolute path: assets/employees/{EMP-ID}/profile */
export function employeeProfileDir(employeeNumber: string): string {
  return path.join(ASSETS_ROOT, 'employees', sanitizeEmployeeFolder(employeeNumber), 'profile');
}

/** Absolute path: assets/employees/{EMP-ID}/documents/{categoryId} */
export function employeeDocumentDir(employeeNumber: string, categoryId: string): string {
  const safeCategory = categoryId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(
    ASSETS_ROOT,
    'employees',
    sanitizeEmployeeFolder(employeeNumber),
    'documents',
    safeCategory,
  );
}

/**
 * Moves a staged multer file into a permanent employee folder.
 * Returns relative path from assets root (for DB) and public URL (for API).
 */
export async function persistStagedFile(params: {
  stagedPath: string;
  destinationDir: string;
  originalName: string;
}): Promise<{ relativePath: string; publicUrl: string; storedFileName: string }> {
  ensureDir(params.destinationDir);

  const storedFileName = uniqueFileName(params.originalName);
  const absolutePath = path.join(params.destinationDir, storedFileName);

  await fs.promises.rename(params.stagedPath, absolutePath);

  const relativePath = path
    .relative(ASSETS_ROOT, absolutePath)
    .split(path.sep)
    .join('/');

  return {
    relativePath,
    publicUrl: `${ASSETS_PUBLIC_PREFIX}/${relativePath}`,
    storedFileName,
  };
}

export async function removePaths(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (filePath) => {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Ignore missing files
      }
    }),
  );
}

export function toPublicAssetUrl(storedPath: string | null | undefined): string | undefined {
  if (!storedPath) return undefined;
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
    return storedPath;
  }
  if (storedPath.startsWith(ASSETS_PUBLIC_PREFIX)) {
    return storedPath;
  }
  if (storedPath.startsWith('meta:')) {
    return undefined;
  }
  if (storedPath === 'discarded') {
    return undefined;
  }
  const normalized = storedPath.replace(/^\/+/, '');
  return `${ASSETS_PUBLIC_PREFIX}/${normalized}`;
}
