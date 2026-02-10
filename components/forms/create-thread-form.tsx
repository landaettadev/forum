'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createThreadSchema } from '@/lib/validation';
import { createThread } from '@/app/actions/thread-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { z } from 'zod';

type CreateThreadFormData = z.infer<typeof createThreadSchema>;

interface CreateThreadFormProps {
  forumId: string;
  forumName: string;
}

export function CreateThreadForm({ forumId, forumName }: CreateThreadFormProps) {
  const router = useRouter();
  const t = useTranslations('createThread');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateThreadFormData>({
    resolver: zodResolver(createThreadSchema),
    defaultValues: {
      forumId,
      isNsfw: false,
    },
  });

  const isNsfw = watch('isNsfw');

  const onSubmit = async (data: CreateThreadFormData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('forumId', data.forumId);
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('isNsfw', data.isNsfw ? 'true' : 'false');

      const result = await createThread(formData);

      if (result.success) {
        toast.success(t('success'));
        router.push(`/hilo/${result.data.threadId}`);
      } else {
        if (result.fieldErrors) {
          // Mostrar errores específicos de campos
          Object.entries(result.fieldErrors).forEach(([field, error]) => {
            toast.error(`${field}: ${error}`);
          });
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="forum-surface p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="forum-text-muted text-sm">
            {t('inForum')} <span className="font-semibold">{forumName}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="title" className="required">
              {t('threadTitle')}
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder={t('titlePlaceholder')}
              className={errors.title ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.title.message}
              </p>
            )}
            <p className="text-xs forum-text-muted mt-1">
              {t('titleHint')}
            </p>
          </div>

          {/* Contenido */}
          <div>
            <Label htmlFor="content" className="required">
              {t('content')}
            </Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder={t('contentPlaceholder')}
              rows={10}
              className={errors.content ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.content && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.content.message}
              </p>
            )}
            <p className="text-xs forum-text-muted mt-1">
              {t('contentHint')}
            </p>
          </div>

          {/* NSFW */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isNsfw"
              checked={isNsfw}
              onCheckedChange={(checked) => setValue('isNsfw', checked as boolean)}
              disabled={isSubmitting}
            />
            <Label
              htmlFor="isNsfw"
              className="text-sm font-normal cursor-pointer"
            >
              {t('nsfwLabel')}
            </Label>
          </div>
        </div>

        <div className="mt-6 p-4 bg-[hsl(var(--forum-surface-alt))] rounded border border-[hsl(var(--forum-border))]">
          <h3 className="font-semibold mb-2 text-sm">{t('rulesTitle')}</h3>
          <ul className="text-xs forum-text-secondary space-y-1">
            <li>• {t('rule1')}</li>
            <li>• {t('rule2')}</li>
            <li>• {t('rule3')}</li>
            <li>• {t('rule4')}</li>
            <li>• {t('rule5')} <a href="/reglas" className="text-[hsl(var(--forum-link))] hover:underline">{t('rulesLink')}</a></li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('creating')}
            </>
          ) : (
            t('create')
          )}
        </Button>
      </div>
    </form>
  );
}
