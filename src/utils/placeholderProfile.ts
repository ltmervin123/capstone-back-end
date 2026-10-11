/** Illustrated avatar used for demo employees that have no uploaded photo. */
export function placeholderProfileUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(seed)}`;
}
