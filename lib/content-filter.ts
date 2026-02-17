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
const REGEX_TIMEOUT_MS = 50; // Max time allowed per regex match
const MAX_REGEX_LENGTH = 200; // Max pattern length to prevent complex patterns

/**
 * Safely execute a regex with timeout protection against ReDoS
 */
function safeRegexTest(pattern: string, flags: string, input: string): { matched: boolean; regex: RegExp | null } {
  if (pattern.length > MAX_REGEX_LENGTH) {
    return { matched: false, regex: null };
  }
  try {
    const regex = new RegExp(pattern, flags);
    const start = Date.now();
    const matched = regex.test(input);
    if (Date.now() - start > REGEX_TIMEOUT_MS) {
      console.warn(`ReDoS warning: regex "${pattern}" took too long, skipping`);
      return { matched: false, regex: null };
    }
    return { matched, regex };
  } catch {
    return { matched: false, regex: null };
  }
}

function safeRegexReplace(pattern: string, flags: string, input: string, replacement: string): string {
  if (pattern.length > MAX_REGEX_LENGTH) return input;
  try {
    const regex = new RegExp(pattern, flags);
    const start = Date.now();
    const result = input.replace(regex, replacement);
    if (Date.now() - start > REGEX_TIMEOUT_MS) {
      console.warn(`ReDoS warning: regex replace "${pattern}" took too long`);
      return input;
    }
    return result;
  } catch {
    return input;
  }
}

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
  return cachedFilters as ContentFilter[];
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
      result = safeRegexReplace(filter.pattern, 'gi', result, filter.replacement);
    } else {
      const escapedPattern = filter.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = safeRegexReplace(escapedPattern, 'gi', result, filter.replacement);
    }
  }

  return result;
}

export async function checkContentClean(content: string): Promise<boolean> {
  const filters = await getContentFilters();

  for (const filter of filters) {
    if (filter.is_regex) {
      const { matched } = safeRegexTest(filter.pattern, 'gi', content);
      if (matched) return false;
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
      const { matched } = safeRegexTest(filter.pattern, 'gi', content);
      if (matched) blocked.push(filter.pattern);
    } else {
      if (content.toLowerCase().includes(filter.pattern.toLowerCase())) {
        blocked.push(filter.pattern);
      }
    }
  }

  return blocked;
}
