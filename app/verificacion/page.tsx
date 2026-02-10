'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Shield, Check, Clock, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';

export default function VerificacionPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('verification');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchVerification();
    }
  }, [user, router]);

  const fetchVerification = async () => {
    if (!user) return;

    setLoading(true);

    const { data } = await supabase
      .from('verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setVerification(data);
    }

    setLoading(false);
  };

  const generateCode = () => {
    const code = `TF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setVerificationCode(code);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    toast.success(t('codeCopied'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !verificationCode) {
      toast.error(t('generateCodeFirst'));
      return;
    }

    if (!photoUrl.trim()) {
      toast.error(t('enterPhotoUrl'));
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('verifications').insert({
        user_id: user.id,
        code: verificationCode,
        photo_url: photoUrl,
        status: 'pending',
      });

      if (error) {
        toast.error(t('submitError'), {
          description: error.message,
        });
      } else {
        toast.success(t('requestSent'), {
          description: t('requestSentDesc'),
        });
        fetchVerification();
        setPhotoUrl('');
      }
    } catch (error) {
      toast.error(t('unexpectedError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !profile) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-6 w-full">
          <div className="text-center py-12">{t('loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs items={[{ label: t('breadcrumb') }]} />

        <div className="flex gap-6">
          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
              <p className="forum-text-secondary">
                {t('subtitle')}
              </p>
            </div>

            {profile.is_verified ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[hsl(var(--forum-verified))]">
                    <Check className="h-6 w-6" />
                    {t('accountVerified')}
                  </CardTitle>
                  <CardDescription>
                    {t('accountVerifiedDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm forum-text-secondary">
                    {t('fullAccess')}
                  </p>
                </CardContent>
              </Card>
            ) : verification?.status === 'pending' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-500">
                    <Clock className="h-6 w-6" />
                    {t('inReview')}
                  </CardTitle>
                  <CardDescription>
                    {t('inReviewDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm forum-text-secondary">
                      {t('inReviewInfo')}
                    </p>
                    <div className="p-3 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded">
                      <div className="text-xs forum-text-muted mb-1">{t('verificationCode')}</div>
                      <div className="font-mono font-semibold">{verification.code}</div>
                    </div>
                    <p className="text-xs forum-text-muted">
                      {t('estimatedTime')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-[hsl(var(--forum-accent))]" />
                    {t('requestVerification')}
                  </CardTitle>
                  <CardDescription>
                    {t('followSteps')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded">
                    <h3 className="font-semibold mb-2">{t('benefits')}</h3>
                    <ul className="text-sm forum-text-secondary space-y-1 list-disc list-inside">
                      <li>{t('benefit1')}</li>
                      <li>{t('benefit2')}</li>
                      <li>{t('benefit3')}</li>
                      <li>{t('benefit4')}</li>
                    </ul>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold">{t('step1')}</h3>
                      <p className="text-sm forum-text-secondary">
                        {t('step1Desc', { username: profile.username })}
                      </p>
                      {!verificationCode ? (
                        <Button
                          type="button"
                          onClick={generateCode}
                          className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
                        >
                          {t('generateCode')}
                        </Button>
                      ) : (
                        <div className="p-4 bg-[hsl(var(--forum-surface-alt))] border-2 border-[hsl(var(--forum-accent))] rounded">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs forum-text-muted mb-1">{t('yourCode')}</div>
                              <div className="text-2xl font-mono font-bold">{verificationCode}</div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={copyCode}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              {t('copy')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {verificationCode && (
                      <>
                        <div className="space-y-3">
                          <h3 className="font-semibold">{t('step2')}</h3>
                          <p className="text-sm forum-text-secondary">
                            {t('step2Desc')}
                          </p>
                          <ul className="text-sm forum-text-secondary list-disc list-inside ml-4 space-y-1">
                            <li>{t('yourCodeItem', { code: verificationCode })}</li>
                            <li>{t('yourUserItem', { username: profile.username })}</li>
                            <li>{t('todayDate', { date: new Date().toLocaleDateString(locale) })}</li>
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <h3 className="font-semibold">{t('step3')}</h3>
                          <p className="text-sm forum-text-secondary">
                            {t('step3Desc')}
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="photoUrl">{t('photoUrlLabel')}</Label>
                            <Input
                              id="photoUrl"
                              type="url"
                              placeholder="https://..."
                              value={photoUrl}
                              onChange={(e) => setPhotoUrl(e.target.value)}
                              disabled={submitting}
                              required
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={submitting || !photoUrl}
                          className="w-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
                        >
                          {submitting ? t('submitting') : t('submitVerification')}
                        </Button>
                      </>
                    )}
                  </form>
                </CardContent>
              </Card>
            )}
          </main>

          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
