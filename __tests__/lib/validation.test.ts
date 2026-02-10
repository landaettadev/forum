import { describe, it, expect } from 'vitest';
import {
  validateData,
  registerSchema,
  loginSchema,
  createThreadSchema,
  createPostSchema,
} from '@/lib/validation';

describe('validation', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const data = {
        email: 'user@example.com',
        username: 'testuser',
        password: 'Password123',
        confirmPassword: 'Password123',
      };
      
      const result = validateData(registerSchema, data);
      expect(result.success).toBe(true);
    });

    it('should reject weak passwords', () => {
      const data = {
        email: 'user@example.com',
        username: 'testuser',
        password: 'weak',
        confirmPassword: 'weak',
      };
      
      const result = validateData(registerSchema, data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.password).toBeDefined();
      }
    });

    it('should require password confirmation', () => {
      const data = {
        email: 'user@example.com',
        username: 'testuser',
        password: 'Password123',
        confirmPassword: 'Different123',
      };
      
      const result = validateData(registerSchema, data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate login data', () => {
      const data = {
        email: 'user@example.com',
        password: 'anypassword',
      };
      
      const result = validateData(loginSchema, data);
      expect(result.success).toBe(true);
    });
  });

  describe('createThreadSchema', () => {
    it('should validate thread creation', () => {
      const data = {
        forumId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Valid Thread Title',
        content: 'This is valid content for a thread',
        isNsfw: false,
      };
      
      const result = validateData(createThreadSchema, data);
      expect(result.success).toBe(true);
    });

    it('should require minimum title length', () => {
      const data = {
        forumId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Hi',
        content: 'Content here',
      };
      
      const result = validateData(createThreadSchema, data);
      expect(result.success).toBe(false);
    });

    it('should sanitize content', () => {
      const data = {
        forumId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Thread Title',
        content: '<script>alert("xss")</script>Normal content',
      };
      
      const result = validateData(createThreadSchema, data);
      if (result.success) {
        expect(result.data.content).not.toContain('<script>');
      }
    });
  });

  describe('createPostSchema', () => {
    it('should validate post creation', () => {
      const data = {
        threadId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'This is a valid post reply',
      };
      
      const result = validateData(createPostSchema, data);
      expect(result.success).toBe(true);
    });

    it('should require content', () => {
      const data = {
        threadId: '123e4567-e89b-12d3-a456-426614174000',
        content: '',
      };
      
      const result = validateData(createPostSchema, data);
      expect(result.success).toBe(false);
    });
  });
});
