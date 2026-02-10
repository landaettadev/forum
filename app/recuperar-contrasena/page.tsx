'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function RecuperarContrasenaPage() {
  const t = useTranslations('passwordRecovery');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/restablecer-contrasena`,
      });

      if (error) {
        toast.error(t('errorSending'), {
          description: error.message,
        });
      } else {
        setSent(true);
        toast.success(t('linkSent'), {
          description: t('checkEmail'),
        });
      }
    } catch (error) {
      toast.error(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))] bg-clip-text text-transparent">
              TransForo
            </Link>
          </div>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
                disabled={loading}
              >
                {loading ? t('sending') : t('sendLink')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                asChild
              >
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('backToLogin')}
                </Link>
              </Button>
            </CardFooter>
          </form>
        ) : (
          <>
            <CardContent className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--forum-accent-muted))] flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
              </div>
              <p className="forum-text-secondary mb-2">
                {t('sentTo')}
              </p>
              <p className="font-semibold mb-4">{email}</p>
              <p className="text-sm forum-text-muted">
                {t('checkInbox')}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('backToLogin')}
                </Link>
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
