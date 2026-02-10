'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast.error(t('loginError'), {
          description: error.message,
        });
      } else {
        toast.success(t('loginSuccess'));
        router.push('/');
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
          <CardTitle>{t('loginTitle')}</CardTitle>
          <CardDescription>
            {t('loginDescription')}
          </CardDescription>
        </CardHeader>
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
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="text-right">
              <Link
                href="/recuperar-contrasena"
                className="text-sm text-[hsl(var(--forum-link))] hover:text-[hsl(var(--forum-link-hover))]"
              >
                {t('forgotPassword')}
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
              disabled={loading}
            >
              {loading ? t('loginButtonLoading') : t('loginButton')}
            </Button>
            <p className="text-sm text-center forum-text-secondary">
              {t('noAccount')}{' '}
              <Link
                href="/registro"
                className="text-[hsl(var(--forum-link))] hover:text-[hsl(var(--forum-link-hover))] font-semibold"
              >
                {t('registerHere')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
