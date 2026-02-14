import { describe, it, expect, vi } from 'vitest';

// Mock resend so sendEmail doesn't actually send
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }),
    },
  })),
}));

import { EmailTemplates } from '@/lib/email';

describe('EmailTemplates', () => {
  describe('welcome', () => {
    it('should escape username in HTML — angle brackets neutralized', () => {
      const template = EmailTemplates.welcome('<script>alert(1)</script>');
      // Raw <script> tag must NOT appear
      expect(template.html).not.toContain('<script>alert(1)</script>');
      // Escaped version MUST appear
      expect(template.html).toContain('&lt;script&gt;');
    });

    it('should block javascript: protocol in verification URL', () => {
      const template = EmailTemplates.welcome('user', 'javascript:alert(1)');
      // escUrl returns '' for javascript: — href should be empty
      expect(template.html).toContain('href=""');
    });

    it('should allow valid https verification URL', () => {
      const url = 'https://tsrating.com/verify?token=abc123';
      const template = EmailTemplates.welcome('user', url);
      expect(template.html).toContain('https://tsrating.com/verify?token=abc123');
    });
  });

  describe('verification', () => {
    it('should escape username — HTML attribute injection neutralized', () => {
      const template = EmailTemplates.verification('"><img src=x onerror=alert(1)>', 'https://example.com/verify');
      // The raw double-quote must be escaped so it can't break out of the attribute
      expect(template.html).toContain('&quot;');
      // Raw <img should NOT appear (angle brackets escaped)
      expect(template.html).not.toContain('<img src=x');
    });

    it('should block javascript: protocol in verification URL', () => {
      const template = EmailTemplates.verification('user', 'javascript:void(0)');
      // escUrl returns '' — the href should be empty
      expect(template.html).toContain('href=""');
    });

    it('should escape plain-text URL display', () => {
      const url = 'https://example.com/verify?a=1&b=<script>';
      const template = EmailTemplates.verification('user', url);
      // The displayed URL text should have < escaped
      expect(template.html).toContain('&lt;script&gt;');
    });
  });

  describe('resetPassword', () => {
    it('should block data: protocol in reset URL', () => {
      const template = EmailTemplates.resetPassword('user', 'data:text/html,<script>alert(1)</script>');
      // escUrl returns '' for data: protocol — href should be empty
      expect(template.html).toContain('href=""');
    });

    it('should allow valid reset URL', () => {
      const url = 'https://tsrating.com/reset?token=xyz';
      const template = EmailTemplates.resetPassword('user', url);
      expect(template.html).toContain('https://tsrating.com/reset?token=xyz');
    });
  });

  describe('newReply', () => {
    it('should escape all user-provided text strings', () => {
      const template = EmailTemplates.newReply(
        '<b>user</b>',
        '<script>title</script>',
        '<img src=x>',
        'https://tsrating.com/hilo/123'
      );
      // Raw HTML tags must be escaped
      expect(template.html).not.toContain('<b>user</b>');
      expect(template.html).not.toContain('<script>title</script>');
      expect(template.html).toContain('&lt;b&gt;');
      expect(template.html).toContain('&lt;script&gt;');
    });

    it('should block javascript: protocol in thread URL', () => {
      const template = EmailTemplates.newReply('user', 'title', 'author', 'javascript:alert(1)');
      expect(template.html).toContain('href=""');
    });
  });

  describe('suspension', () => {
    it('should escape reason and username — angle brackets neutralized', () => {
      const template = EmailTemplates.suspension(
        '<script>user</script>',
        '<img src=x>',
        '2026-12-31'
      );
      // Raw tags must NOT appear
      expect(template.html).not.toContain('<script>user</script>');
      expect(template.html).not.toContain('<img src=x>');
      // Escaped versions MUST appear
      expect(template.html).toContain('&lt;script&gt;');
      expect(template.html).toContain('&lt;img src=x&gt;');
    });
  });
});
