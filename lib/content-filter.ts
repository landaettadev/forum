import { supabase } from './supabase';

interface ContentFilter {
  id: string;
  filter_type: 'word' | 'url' | 'phrase';
  pattern: string;
  replacement: string;
  is_regex: boolean;
  is_active: boolean;
}

let cachedFilters: ContentFilter[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getContentFilters(): Promise<ContentFilter[]> {
  const now = Date.now();
  
  if (cachedFilters && (now - cacheTime) < CACHE_DURATION) {
    return cachedFilters;
  }

  const { data } = await supabase
    .from('content_filters')
    .select('*')
    .eq('is_active', true);

  cachedFilters = data || [];
  cacheTime = now;
  return cachedFilters;
}

export function invalidateFilterCache() {
  cachedFilters = null;
  cacheTime = 0;
}

export async function applyContentFilters(content: string): Promise<string> {
  const filters = await getContentFilters();
  let result = content;

  for (const filter of filters) {
    if (filter.is_regex) {
      try {
        const regex = new RegExp(filter.pattern, 'gi');
        result = result.replace(regex, filter.replacement);
      } catch {
        // Invalid regex, skip
      }
    } else {
      // Case-insensitive replace
      const escapedPattern = filter.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedPattern, 'gi');
      result = result.replace(regex, filter.replacement);
    }
  }

  return result;
}

export async function checkContentClean(content: string): Promise<boolean> {
  const filters = await getContentFilters();

  for (const filter of filters) {
    if (filter.is_regex) {
      try {
        const regex = new RegExp(filter.pattern, 'gi');
        if (regex.test(content)) {
          return false;
        }
      } catch {
        // Invalid regex, skip
      }
    } else {
      if (content.toLowerCase().includes(filter.pattern.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

export async function getBlockedPatterns(content: string): Promise<string[]> {
  const filters = await getContentFilters();
  const blocked: string[] = [];

  for (const filter of filters) {
    if (filter.is_regex) {
      try {
        const regex = new RegExp(filter.pattern, 'gi');
        if (regex.test(content)) {
          blocked.push(filter.pattern);
        }
      } catch {
        // Invalid regex, skip
      }
    } else {
      if (content.toLowerCase().includes(filter.pattern.toLowerCase())) {
        blocked.push(filter.pattern);
      }
    }
  }

  return blocked;
}
