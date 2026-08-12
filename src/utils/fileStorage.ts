/** Public URL prefix kept for any legacy relative paths still in the DB. */
export const ASSETS_PUBLIC_PREFIX = '/api/assets';

export function sanitizeEmployeeFolder(employeeNumber: string): string {
  return employeeNumber.replace(/[^a-zA-Z0-9._-]/g, '_').toUpperCase();
}

export function sanitizeFileName(originalName: string): string {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
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
