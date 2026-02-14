import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase storage
const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockList = vi.fn();
const mockGetBucket = vi.fn();
const mockCreateBucket = vi.fn();

const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
  getPublicUrl: mockGetPublicUrl,
  list: mockList,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: (name: string) => (mockStorageFrom as any)(name),
      getBucket: (name: string) => (mockGetBucket as any)(name),
      createBucket: (name: string, opts?: any) => (mockCreateBucket as any)(name, opts),
    },
  },
}));

// Mock sanitize helpers
vi.mock('@/lib/sanitize', () => ({
  sanitizeFilename: (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_'),
  validateFileSize: (size: number, maxMB: number) => size <= maxMB * 1024 * 1024,
  validateFileType: (type: string, allowed: string[]) => allowed.includes(type),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}));

import {
  uploadFile,
  uploadAvatar,
  deleteFile,
  getPublicUrl,
  createThumbnail,
  validateImageFile,
  getFileInfo,
  STORAGE_BUCKETS,
} from '@/lib/storage';

function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ data: { path: 'test/file.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.supabase.co/test/file.jpg' } });
    mockRemove.mockResolvedValue({ error: null });
    mockList.mockResolvedValue({ data: [], error: null });
  });

  // =============================================
  // UPLOAD FILE
  // =============================================
  describe('uploadFile', () => {
    it('should upload a valid file and return URL', async () => {
      const file = createMockFile('photo.jpg', 1024 * 1024, 'image/jpeg'); // 1MB
      const result = await uploadFile(file, { bucket: STORAGE_BUCKETS.MEDIA });
      expect(result.success).toBe(true);
      expect(result.url).toContain('https://storage.supabase.co');
      expect(result.path).toBe('test/file.jpg');
      expect(mockStorageFrom).toHaveBeenCalledWith('media');
    });

    it('should reject files exceeding max size', async () => {
      const file = createMockFile('huge.jpg', 10 * 1024 * 1024, 'image/jpeg'); // 10MB
      const result = await uploadFile(file, { bucket: STORAGE_BUCKETS.MEDIA, maxSizeMB: 5 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('tamaño máximo');
    });

    it('should reject disallowed file types', async () => {
      const file = createMockFile('hack.exe', 1024, 'application/x-msdownload');
      const result = await uploadFile(file, { bucket: STORAGE_BUCKETS.MEDIA });
      expect(result.success).toBe(false);
      expect(result.error).toContain('no permitido');
    });

    it('should handle supabase upload errors', async () => {
      mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'Upload failed' } });
      const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
      const result = await uploadFile(file, { bucket: STORAGE_BUCKETS.MEDIA });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al subir');
    });

    it('should use folder in file path when provided', async () => {
      const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
      await uploadFile(file, { bucket: STORAGE_BUCKETS.MEDIA, folder: 'user-123' });
      // The upload call should include the folder in the path
      const uploadPath = mockUpload.mock.calls[0][0];
      expect(uploadPath).toContain('user-123/');
    });

    it('should generate unique filenames with timestamp', async () => {
      const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
      await uploadFile(file, { bucket: STORAGE_BUCKETS.MEDIA });
      const uploadPath = mockUpload.mock.calls[0][0] as string;
      // Should contain a timestamp pattern
      expect(uploadPath).toMatch(/^\d+_[a-z0-9]+\.jpg$/);
    });
  });

  // =============================================
  // UPLOAD AVATAR
  // =============================================
  describe('uploadAvatar', () => {
    it('should upload to avatars bucket with 2MB limit', async () => {
      const file = createMockFile('avatar.png', 1024 * 1024, 'image/png'); // 1MB
      const result = await uploadAvatar(file, 'user-123');
      expect(result.success).toBe(true);
      expect(mockStorageFrom).toHaveBeenCalledWith('avatars');
    });

    it('should reject avatars over 2MB', async () => {
      const file = createMockFile('big-avatar.png', 3 * 1024 * 1024, 'image/png'); // 3MB
      const result = await uploadAvatar(file, 'user-123');
      expect(result.success).toBe(false);
      expect(result.error).toContain('tamaño máximo');
    });
  });

  // =============================================
  // DELETE FILE
  // =============================================
  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const result = await deleteFile(STORAGE_BUCKETS.MEDIA, 'user-123/photo.jpg');
      expect(result.success).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(['user-123/photo.jpg']);
    });

    it('should handle delete errors', async () => {
      mockRemove.mockResolvedValueOnce({ error: { message: 'Not found' } });
      const result = await deleteFile(STORAGE_BUCKETS.MEDIA, 'nonexistent.jpg');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al eliminar');
    });
  });

  // =============================================
  // GET PUBLIC URL
  // =============================================
  describe('getPublicUrl', () => {
    it('should return the public URL for a file', () => {
      const url = getPublicUrl(STORAGE_BUCKETS.MEDIA, 'user-123/photo.jpg');
      expect(url).toBe('https://storage.supabase.co/test/file.jpg');
      expect(mockStorageFrom).toHaveBeenCalledWith('media');
    });
  });

  // =============================================
  // THUMBNAIL
  // =============================================
  describe('createThumbnail', () => {
    it('should return Next.js image optimization URL', () => {
      const url = createThumbnail('https://storage.supabase.co/photo.jpg', 200, 200);
      expect(url).toContain('/_next/image');
      expect(url).toContain('w=200');
      expect(url).toContain('q=75');
      expect(url).toContain(encodeURIComponent('https://storage.supabase.co/photo.jpg'));
    });

    it('should return empty string for empty URL', () => {
      const url = createThumbnail('');
      expect(url).toBe('');
    });
  });

  // =============================================
  // VALIDATE IMAGE FILE
  // =============================================
  describe('validateImageFile', () => {
    it('should accept valid image files', () => {
      const file = createMockFile('photo.jpg', 1024 * 1024, 'image/jpeg');
      const result = validateImageFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject non-image files', () => {
      const file = createMockFile('doc.pdf', 1024, 'application/pdf');
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('debe ser una imagen');
    });

    it('should reject unsupported image types', () => {
      const file = createMockFile('image.tiff', 1024, 'image/tiff');
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Formato de imagen no soportado');
    });

    it('should reject images over 5MB', () => {
      const file = createMockFile('big.jpg', 6 * 1024 * 1024, 'image/jpeg');
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muy grande');
    });
  });

  // =============================================
  // GET FILE INFO
  // =============================================
  describe('getFileInfo', () => {
    it('should return file list from supabase', async () => {
      mockList.mockResolvedValueOnce({ data: [{ name: 'file.jpg' }], error: null });
      const info = await getFileInfo(STORAGE_BUCKETS.MEDIA, 'user-123');
      expect(info).toEqual([{ name: 'file.jpg' }]);
    });

    it('should return null on error', async () => {
      mockList.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });
      const info = await getFileInfo(STORAGE_BUCKETS.MEDIA, 'bad-path');
      expect(info).toBeNull();
    });
  });
});
