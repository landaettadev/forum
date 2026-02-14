/**
 * Generate a URL-friendly slug from a string.
 * Handles accented characters, special chars, and truncation.
 */
export function generateSlug(text: string, maxLength = 80): string {
  let slug = text.toLowerCase();

  // Replace accented characters
  const accents: Record<string, string> = {
    á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
    é: 'e', è: 'e', ê: 'e', ë: 'e',
    í: 'i', ì: 'i', î: 'i', ï: 'i',
    ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
    ú: 'u', ù: 'u', û: 'u', ü: 'u',
    ñ: 'n', ç: 'c', ß: 'ss',
  };
  slug = slug.replace(/[áàâãäéèêëíìîïóòôõöúùûüñçß]/g, (c) => accents[c] || c);

  // Remove non-alphanumeric (keep spaces and hyphens)
  slug = slug.replace(/[^a-z0-9\s-]/g, '');

  // Collapse whitespace/hyphens into single hyphen
  slug = slug.trim().replace(/[\s-]+/g, '-');

  // Truncate at word boundary
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength).replace(/-[^-]*$/, '');
  }

  return slug;
}

/**
 * Build the SEO-friendly thread URL.
 * Format: /foros/{countrySlug}/{regionSlug}/{threadSlug}
 * Fallback: /hilo/{threadId} if country/region info is missing.
 */
export function threadUrl(thread: {
  id: string;
  slug?: string | null;
  region?: {
    slug?: string;
    country?: { slug?: string };
  } | null;
}): string {
  const countrySlug = thread.region?.country?.slug;
  const regionSlug = thread.region?.slug;
  const threadSlug = thread.slug;

  if (countrySlug && regionSlug && threadSlug) {
    return `/foros/${countrySlug}/${regionSlug}/${threadSlug}`;
  }

  // Fallback to UUID-based URL
  return `/hilo/${thread.id}`;
}
