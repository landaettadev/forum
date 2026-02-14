import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockEq = vi.fn();
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import {
  getContentFilters,
  invalidateFilterCache,
  applyContentFilters,
  checkContentClean,
  getBlockedPatterns,
} from '@/lib/content-filter';

// Helper to set mock filters
function setMockFilters(filters: any[]) {
  mockEq.mockResolvedValue({ data: filters });
}

describe('content-filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateFilterCache();
    setMockFilters([]);
  });

  // =============================================
  // CACHE BEHAVIOR
  // =============================================
  describe('getContentFilters — caching', () => {
    it('should fetch filters from supabase on first call', async () => {
      setMockFilters([{ id: '1', filter_type: 'word', pattern: 'spam', replacement: '***', is_regex: false, is_active: true }]);
      const filters = await getContentFilters();
      expect(filters).toHaveLength(1);
      expect(mockFrom).toHaveBeenCalledWith('content_filters');
    });

    it('should return cached filters on subsequent calls', async () => {
      setMockFilters([{ id: '1', filter_type: 'word', pattern: 'spam', replacement: '***', is_regex: false, is_active: true }]);
      await getContentFilters();
      await getContentFilters();
      // Should only call supabase once due to cache
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('should refetch after cache invalidation', async () => {
      setMockFilters([]);
      await getContentFilters();
      invalidateFilterCache();
      setMockFilters([{ id: '2', filter_type: 'word', pattern: 'test', replacement: '***', is_regex: false, is_active: true }]);
      const filters = await getContentFilters();
      expect(filters).toHaveLength(1);
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  // =============================================
  // APPLY CONTENT FILTERS
  // =============================================
  describe('applyContentFilters', () => {
    it('should replace plain string patterns (case insensitive)', async () => {
      setMockFilters([
        { id: '1', filter_type: 'word', pattern: 'badword', replacement: '***', is_regex: false, is_active: true },
      ]);
      const result = await applyContentFilters('This is a Badword in text');
      expect(result).toBe('This is a *** in text');
    });

    it('should replace regex patterns', async () => {
      setMockFilters([
        { id: '1', filter_type: 'phrase', pattern: '\\b\\d{4}-\\d{4}-\\d{4}\\b', replacement: '[REDACTED]', is_regex: true, is_active: true },
      ]);
      const result = await applyContentFilters('My card: 1234-5678-9012');
      expect(result).toBe('My card: [REDACTED]');
    });

    it('should apply multiple filters in order', async () => {
      setMockFilters([
        { id: '1', filter_type: 'word', pattern: 'spam', replacement: '***', is_regex: false, is_active: true },
        { id: '2', filter_type: 'word', pattern: 'scam', replacement: '###', is_regex: false, is_active: true },
      ]);
      const result = await applyContentFilters('This is spam and scam');
      expect(result).toBe('This is *** and ###');
    });

    it('should return unchanged content when no filters match', async () => {
      setMockFilters([
        { id: '1', filter_type: 'word', pattern: 'badword', replacement: '***', is_regex: false, is_active: true },
      ]);
      const result = await applyContentFilters('This is clean content');
      expect(result).toBe('This is clean content');
    });

    it('should handle empty filter list', async () => {
      setMockFilters([]);
      const result = await applyContentFilters('Any content');
      expect(result).toBe('Any content');
    });
  });

  // =============================================
  // REGEX SAFETY (ReDoS protection)
  // =============================================
  describe('regex safety', () => {
    it('should reject regex patterns longer than 200 chars', async () => {
      const longPattern = 'a'.repeat(201);
      setMockFilters([
        { id: '1', filter_type: 'phrase', pattern: longPattern, replacement: '***', is_regex: true, is_active: true },
      ]);
      // Should return content unchanged — pattern rejected
      const result = await applyContentFilters('aaa');
      expect(result).toBe('aaa');
    });

    it('should handle invalid regex gracefully', async () => {
      setMockFilters([
        { id: '1', filter_type: 'phrase', pattern: '[invalid', replacement: '***', is_regex: true, is_active: true },
      ]);
      // Should not throw — invalid regex is caught
      const result = await applyContentFilters('test content');
      expect(result).toBe('test content');
    });
  });

  // =============================================
  // CHECK CONTENT CLEAN
  // =============================================
  describe('checkContentClean', () => {
    it('should return true for clean content', async () => {
      setMockFilters([
        { id: '1', filter_type: 'word', pattern: 'spam', replacement: '***', is_regex: false, is_active: true },
      ]);
      const clean = await checkContentClean('This is fine');
      expect(clean).toBe(true);
    });

    it('should return false when plain text pattern matches', async () => {
      setMockFilters([
        { id: '1', filter_type: 'word', pattern: 'spam', replacement: '***', is_regex: false, is_active: true },
      ]);
      const clean = await checkContentClean('This is spam');
      expect(clean).toBe(false);
    });

    it('should return false when regex pattern matches', async () => {
      setMockFilters([
        { id: '1', filter_type: 'phrase', pattern: 'sp[a@]m', replacement: '***', is_regex: true, is_active: true },
      ]);
      const clean = await checkContentClean('This is sp@m');
      expect(clean).toBe(false);
    });

    it('should be case insensitive for plain patterns', async () => {
      setMockFilters([
        { id: '1', filter_type: 'word', pattern: 'SPAM', replacement: '***', is_regex: false, is_active: true },
      ]);
      const clean = await checkContentClean('this has spam in it');
      expect(clean).toBe(false);
    });
  });

  // =============================================
  // GET BLOCKED PATTERNS
  // =============================================
  describe('getBlockedPatterns', () => {
    it('should return empty array for clean content', async () => {
      setMockFilters([
        { id: '1', filter_type: 'word', pattern: 'spam', replacement: '***', is_regex: false, is_active: true },
      ]);
      const blocked = await getBlockedPatterns('Clean content here');
      expect(blocked).toEqual([]);
    });

    it('should return all matched patterns', async () => {
      setMockFilters([
        { id: '1', filter_type: 'word', pattern: 'spam', replacement: '***', is_regex: false, is_active: true },
        { id: '2', filter_type: 'word', pattern: 'scam', replacement: '###', is_regex: false, is_active: true },
        { id: '3', filter_type: 'word', pattern: 'clean', replacement: '---', is_regex: false, is_active: true },
      ]);
      const blocked = await getBlockedPatterns('This has spam and scam');
      expect(blocked).toContain('spam');
      expect(blocked).toContain('scam');
      expect(blocked).not.toContain('clean');
      expect(blocked).toHaveLength(2);
    });

    it('should return regex patterns that match', async () => {
      setMockFilters([
        { id: '1', filter_type: 'phrase', pattern: '\\d{3}-\\d{3}', replacement: '***', is_regex: true, is_active: true },
      ]);
      const blocked = await getBlockedPatterns('Call 123-456');
      expect(blocked).toEqual(['\\d{3}-\\d{3}']);
    });
  });
});
