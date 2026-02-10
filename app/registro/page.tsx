'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('passwordsMismatch'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('passwordTooShort'));
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error(t('passwordRequirements'));
      return;
    }

    if (!acceptTerms) {
      toast.error(t('mustAcceptRules'));
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, username);

      if (error) {
        toast.error(t('registerError'), {
          description: error.message,
        });
      } else {
        toast.success(t('registerSuccess'), {
          description: t('registerSuccessDesc'),
        });
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
          <CardTitle>{t('registerTitle')}</CardTitle>
          <CardDescription>
            {t('registerDescription')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                disabled={loading}
              />
              <label
                htmlFor="terms"
                className="text-sm forum-text-secondary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('ageConfirmation')}{' '}
                <Link href="/reglas" className="text-[hsl(var(--forum-link))] hover:text-[hsl(var(--forum-link-hover))]">
                  {t('forumRules')}
                </Link>
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
              disabled={loading}
            >
              {loading ? t('registerButtonLoading') : t('registerButton')}
            </Button>
            <p className="text-sm text-center forum-text-secondary">
              {t('hasAccount')}{' '}
              <Link
                href="/login"
                className="text-[hsl(var(--forum-link))] hover:text-[hsl(var(--forum-link-hover))] font-semibold"
              >
                {t('loginHere')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
