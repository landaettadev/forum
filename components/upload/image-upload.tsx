'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { validateImageFile, compressImage, uploadMediaImage } from '@/lib/storage';
import { toast } from 'sonner';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface ImageUploadProps {
  userId: string;
  onUploadComplete?: (url: string, path: string) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  compressImages?: boolean;
  showPreview?: boolean;
}

interface UploadedImage {
  url: string;
  path: string;
  file: File;
  preview: string;
}

export function ImageUpload({
  userId,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  compressImages = true,
  showPreview = true,
}: ImageUploadProps) {
  const t = useTranslations('common');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Verificar límite de archivos
    if (uploadedImages.length + files.length > maxFiles) {
      toast.error(t('maxImagesError', { max: maxFiles }));
      return;
    }

    handleUpload(files);
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    setProgress(0);

    try {
      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        // Validar imagen
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error || t('invalidFile'));
          continue;
        }

        // Comprimir si está habilitado
        let fileToUpload = file;
        if (compressImages) {
          try {
            fileToUpload = await compressImage(file);
          } catch (error) {
            console.error('Error compressing:', error);
            // Continuar con archivo original si falla compresión
          }
        }

        // Subir imagen
        const result = await uploadMediaImage(fileToUpload, userId);

        if (result.success && result.url && result.path) {
          // Crear preview
          const preview = URL.createObjectURL(file);
          
          setUploadedImages(prev => [
            ...prev,
            {
              url: result.url!,
              path: result.path!,
              file,
              preview,
            },
          ]);

          onUploadComplete?.(result.url, result.path);
          toast.success(t('imageUploaded'));
        } else {
          const error = result.error || t('imageUploadError');
          toast.error(error);
          onUploadError?.(error);
        }

        completedFiles++;
        setProgress((completedFiles / totalFiles) * 100);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('unexpectedUploadError'));
      onUploadError?.('Error inesperado');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    setUploadedImages(prev => {
      const updated = [...prev];
      // Liberar preview URL
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-[hsl(var(--forum-border))] rounded-lg p-8 text-center hover:border-[hsl(var(--forum-accent))] transition-colors cursor-pointer"
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || uploadedImages.length >= maxFiles}
        />

        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-[hsl(var(--forum-accent))]" />
            <p className="font-semibold">Subiendo imágenes...</p>
            <Progress value={progress} className="w-full max-w-xs mx-auto" />
            <p className="text-sm forum-text-muted">{Math.round(progress)}%</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="h-12 w-12 mx-auto forum-text-muted" />
            <div>
              <p className="font-semibold mb-1">
                Click para subir o arrastra imágenes aquí
              </p>
              <p className="text-sm forum-text-muted">
                JPG, PNG, GIF, WebP hasta 5MB
              </p>
              <p className="text-xs forum-text-muted mt-1">
                {uploadedImages.length}/{maxFiles} imágenes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Grid */}
      {showPreview && uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploadedImages.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square group rounded-lg overflow-hidden border border-[hsl(var(--forum-border))]"
            >
              <Image
                src={image.preview}
                alt={`Uploaded ${index + 1}`}
                fill
                className="object-cover"
              />
              <button
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('deleteImage')}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {image.file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image URLs (hidden, for form submission) */}
      {uploadedImages.map((image, index) => (
        <input
          key={index}
          type="hidden"
          name="imageUrls[]"
          value={image.url}
        />
      ))}
    </div>
  );
}

/**
 * Componente simple para avatar upload
 */
export function AvatarUpload({
  currentAvatar,
  onUploadComplete: _onUploadComplete,
}: {
  currentAvatar?: string;
  onUploadComplete: (url: string) => void;
}) {
  const t = useTranslations('common');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || t('invalidFile'));
      return;
    }

    setUploading(true);

    try {
      // Comprimir
      const compressed = await compressImage(file, 400, 400, 0.8);

      // Crear preview local
      const previewUrl = URL.createObjectURL(compressed);
      setPreview(previewUrl);

      // Subir (aquí deberías obtener el userId del contexto)
      // Por ahora, solo mostramos el preview
      toast.success(t('avatarUpdated'));
      // onUploadComplete debería llamarse después del upload real
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(t('avatarUploadError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {preview ? (
          <Image
            src={preview}
            alt="Avatar"
            width={120}
            height={120}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-[120px] h-[120px] rounded-full bg-[hsl(var(--forum-surface-alt))] flex items-center justify-center">
            <ImageIcon className="h-12 w-12 forum-text-muted" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Cambiar Avatar
          </>
        )}
      </Button>
    </div>
  );
}
