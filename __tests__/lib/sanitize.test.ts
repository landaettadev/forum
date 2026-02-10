import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  escapeHtml,
  sanitizeUrl,
  sanitizeUsername,
  validateEmail,
  detectSpam,
  validateLinkCount,
} from '@/lib/sanitize';

describe('sanitize', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove iframes', () => {
      const input = '<iframe src="evil.com"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<iframe');
    });
  });

  describe('escapeHtml', () => {
    it('should escape special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"quotes"')).toBe('&quot;quotes&quot;');
      expect(escapeHtml("'single'")).toBe('&#x27;single&#x27;');
      expect(escapeHtml('&ampersand')).toBe('&amp;ampersand');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http and https', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });
  });

  describe('sanitizeUsername', () => {
    it('should only allow alphanumeric and dashes', () => {
      expect(sanitizeUsername('user-name_123')).toBe('user-name_123');
      expect(sanitizeUsername('User@Name!')).toBe('username');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeUsername('USERNAME')).toBe('username');
    });

    it('should limit length to 20 characters', () => {
      expect(sanitizeUsername('a'.repeat(30))).toHaveLength(20);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('detectSpam', () => {
    it('should detect common spam patterns', () => {
      expect(detectSpam('Buy viagra now!')).toBe(true);
      expect(detectSpam('Click here for discount')).toBe(true);
      expect(detectSpam('You won the lottery!!!')).toBe(true);
    });

    it('should allow normal content', () => {
      expect(detectSpam('Hello, this is a normal message')).toBe(false);
    });
  });

  describe('validateLinkCount', () => {
    it('should count URLs correctly', () => {
      const tooManyLinks = 'Check https://a.com https://b.com https://c.com https://d.com https://e.com https://f.com';
      expect(validateLinkCount(tooManyLinks, 5)).toBe(false);
    });

    it('should allow content within limit', () => {
      const okLinks = 'Check https://a.com and https://b.com';
      expect(validateLinkCount(okLinks, 5)).toBe(true);
    });
  });
});
