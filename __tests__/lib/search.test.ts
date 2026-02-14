import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the private highlightMatch function indirectly through search results,
// but we can also test the module's exported search functions with mocked Supabase.

// Mock supabase
const mockSelect = vi.fn();
const mockIlike = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockRange = vi.fn();

const chainable = {
  select: mockSelect,
  ilike: mockIlike,
  order: mockOrder,
  eq: mockEq,
  gte: mockGte,
  lte: mockLte,
  range: mockRange,
};

// Make every method return the chainable object
Object.values(chainable).forEach((fn) => fn.mockReturnValue(chainable));

// Final result
mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainable),
  },
}));

import { searchThreads, searchPosts, searchUsers, getSearchSuggestions } from '@/lib/search';

describe('search module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(chainable).forEach((fn) => fn.mockReturnValue(chainable));
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
  });

  describe('searchThreads', () => {
    it('should return empty results on no matches', async () => {
      const result = await searchThreads('nonexistent');
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should call supabase with escaped LIKE pattern', async () => {
      await searchThreads('test%query_special');
      // The ilike call should have escaped % and _
      expect(mockIlike).toHaveBeenCalled();
      const pattern = mockIlike.mock.calls[0][1];
      expect(pattern).toContain('\\%');
      expect(pattern).toContain('\\_');
    });

    it('should apply forumId filter', async () => {
      await searchThreads('test', { forumId: 'forum-123' });
      expect(mockEq).toHaveBeenCalledWith('forum_id', 'forum-123');
    });

    it('should apply date filters', async () => {
      await searchThreads('test', { dateFrom: '2026-01-01', dateTo: '2026-12-31' });
      expect(mockGte).toHaveBeenCalledWith('created_at', '2026-01-01');
      expect(mockLte).toHaveBeenCalledWith('created_at', '2026-12-31');
    });
  });

  describe('searchPosts', () => {
    it('should return empty results on error', async () => {
      mockRange.mockResolvedValueOnce({ data: null, error: { message: 'fail' }, count: 0 });
      const result = await searchPosts('test');
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('searchUsers', () => {
    it('should search by username with escaped pattern', async () => {
      await searchUsers('user%name');
      expect(mockIlike).toHaveBeenCalled();
      const pattern = mockIlike.mock.calls[0][1];
      expect(pattern).toContain('\\%');
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return empty for queries shorter than 2 chars', async () => {
      const result = await getSearchSuggestions('a');
      expect(result).toEqual([]);
    });
  });
});

// Test the highlightMatch XSS fix by importing the module and checking output patterns
describe('search XSS protection', () => {
  it('search results highlight field should escape HTML in text', async () => {
    // Simulate a thread with XSS in title
    const maliciousThread = {
      id: '1',
      title: '<script>alert("xss")</script>test',
      created_at: new Date().toISOString(),
      views_count: 0,
      replies_count: 0,
      is_pinned: false,
      is_hot: false,
      author: { id: '1', username: 'user', avatar_url: null },
      forum: { id: '1', name: 'Test', slug: 'test' },
    };

    mockRange.mockResolvedValueOnce({
      data: [maliciousThread],
      error: null,
      count: 1,
    });

    const result = await searchThreads('test');
    if (result.results.length > 0) {
      const highlight = result.results[0].highlight || '';
      // Should NOT contain raw <script> tags
      expect(highlight).not.toContain('<script>');
      // Should contain escaped version
      expect(highlight).toContain('&lt;script&gt;');
    }
  });
});
