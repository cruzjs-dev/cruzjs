/**
 * Slug generation utilities for organization names
 */

/**
 * Generate URL-friendly slug from organization name
 * Converts to lowercase, replaces spaces/special chars with hyphens, removes duplicates
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate unique slug by appending number if slug already exists
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;

  while (attempt < maxAttempts) {
    const exists = await checkExists(slug);
    
    if (!exists) {
      return slug;
    }

    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Fallback: append timestamp if max attempts reached
  return `${baseSlug}-${Date.now()}`;
}

