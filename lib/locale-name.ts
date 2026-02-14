/**
 * Get the locale-specific name from a database entity that has name_es, name_en, etc. columns.
 * Falls back to name_en, then name, then name_es.
 */
export function getLocalizedName(entity: Record<string, unknown>, locale: string): string {
  const key = `name_${locale}`;
  return (entity[key] as string) || (entity.name_en as string) || (entity.name as string) || (entity.name_es as string) || '';
}
