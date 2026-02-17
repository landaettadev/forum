'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { Shield, Check, Clock, Copy, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { submitVerificationRequest } from '@/app/mi-cuenta/actions';

export default function VerificacionPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('account');
  const tV = useTranslations('verification');

  const [verLoading, setVerLoading] = useState(true);
  const [verSubmitting, setVerSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [verification, setVerification] = useState<any>(null);
  const [verType, setVerType] = useState<'escort' | 'moderator'>('escort');
  const [verCode, setVerCode] = useState('');
  const [verPhotoUrl, setVerPhotoUrl] = useState('');
  const [verFullName, setVerFullName] = useState('');
  const [verContactInfo, setVerContactInfo] = useState('');
  const [verExperience, setVerExperience] = useState('');
  const [verMotivation, setVerMotivation] = useState('');
  const [verAvailability, setVerAvailability] = useState('');
  const [verLanguages, setVerLanguages] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const fetchVerification = useCallback(async () => {
    if (!user) return;
    setVerLoading(true);
    const { data } = await supabase
      .from('verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setVerification(data);
    setVerLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchVerification();
  }, [user, router, fetchVerification, authLoading]);

  const generateCode = () => {
    const code = `TSR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setVerCode(code);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(verCode);
    setCodeCopied(true);
    toast.success(t('verCopied'));
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleVerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerSubmitting(true);
    try {
      const langs = verLanguages.split(',').map(l => l.trim()).filter(Boolean);
      const result = await submitVerificationRequest({
        verification_type: verType,
        photo_url: verPhotoUrl || undefined,
        code: verCode || undefined,
        full_name: verFullName || undefined,
        contact_info: verContactInfo || undefined,
        experience: verExperience || undefined,
        languages: langs.length ? langs : undefined,
        motivation: verMotivation || undefined,
        availability: verAvailability || undefined,
      });
      if (result.success) {
        toast.success(t('verSent'), { description: t('verSentDesc') });
        fetchVerification();
        setVerPhotoUrl('');
        setVerCode('');
        setVerFullName('');
        setVerContactInfo('');
        setVerExperience('');
        setVerMotivation('');
        setVerAvailability('');
        setVerLanguages('');
      } else {
        toast.error(t('verError'), { description: result.error });
      }
    } catch {
      toast.error(t('verError'));
    } finally {
      setVerSubmitting(false);
    }
  };

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs items={[{ label: tV('breadcrumb') }]} />

        <div className="flex gap-6">
          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{t('verification')}</h1>
              <p className="forum-text-secondary">
                {t('verificationDesc')}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                  {t('verification')}
                </CardTitle>
                <CardDescription>{t('verificationDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {verLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin forum-text-muted" />
                  </div>
                ) : profile.is_verified ? (
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Check className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">{t('verAlreadyVerified')}</p>
                      <p className="text-sm forum-text-muted">{t('verAlreadyVerifiedDesc')}</p>
                    </div>
                  </div>
                ) : verification?.status === 'pending' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-yellow-700 dark:text-yellow-400">{t('verPending')}</p>
                        <p className="text-sm forum-text-muted">{t('verPendingDesc')}</p>
                      </div>
                    </div>
                    {verification.code && (
                      <div className="p-3 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded text-sm">
                        <span className="forum-text-muted">{t('verCodeLabel')}:</span>{' '}
                        <span className="font-mono font-semibold">{verification.code}</span>
                      </div>
                    )}
                    <p className="text-xs forum-text-muted">{t('verEstimatedTime')}</p>
                  </div>
                ) : verification?.status === 'rejected' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <X className="h-6 w-6 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-red-700 dark:text-red-400">{t('verRejected')}</p>
                        <p className="text-sm forum-text-muted">
                          {verification.rejection_reason || t('verRejectedDefault')}
                        </p>
                      </div>
                    </div>
                    <VerificationForm
                      t={t}
                      profile={profile}
                      verType={verType}
                      setVerType={setVerType}
                      verCode={verCode}
                      generateCode={generateCode}
                      copyCode={copyCode}
                      codeCopied={codeCopied}
                      verPhotoUrl={verPhotoUrl}
                      setVerPhotoUrl={setVerPhotoUrl}
                      verFullName={verFullName}
                      setVerFullName={setVerFullName}
                      verContactInfo={verContactInfo}
                      setVerContactInfo={setVerContactInfo}
                      verExperience={verExperience}
                      setVerExperience={setVerExperience}
                      verMotivation={verMotivation}
                      setVerMotivation={setVerMotivation}
                      verAvailability={verAvailability}
                      setVerAvailability={setVerAvailability}
                      verLanguages={verLanguages}
                      setVerLanguages={setVerLanguages}
                      verSubmitting={verSubmitting}
                      handleVerSubmit={handleVerSubmit}
                    />
                  </div>
                ) : (
                  <VerificationForm
                    t={t}
                    profile={profile}
                    verType={verType}
                    setVerType={setVerType}
                    verCode={verCode}
                    generateCode={generateCode}
                    copyCode={copyCode}
                    codeCopied={codeCopied}
                    verPhotoUrl={verPhotoUrl}
                    setVerPhotoUrl={setVerPhotoUrl}
                    verFullName={verFullName}
                    setVerFullName={setVerFullName}
                    verContactInfo={verContactInfo}
                    setVerContactInfo={setVerContactInfo}
                    verExperience={verExperience}
                    setVerExperience={setVerExperience}
                    verMotivation={verMotivation}
                    setVerMotivation={setVerMotivation}
                    verAvailability={verAvailability}
                    setVerAvailability={setVerAvailability}
                    verLanguages={verLanguages}
                    setVerLanguages={setVerLanguages}
                    verSubmitting={verSubmitting}
                    handleVerSubmit={handleVerSubmit}
                  />
                )}
              </CardContent>
            </Card>
          </main>

          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VerificationForm({ t, profile, verType, setVerType, verCode, generateCode, copyCode, codeCopied, verPhotoUrl, setVerPhotoUrl, verFullName, setVerFullName, verContactInfo, setVerContactInfo, verExperience, setVerExperience, verMotivation, setVerMotivation, verAvailability, setVerAvailability, verLanguages, setVerLanguages, verSubmitting, handleVerSubmit }: any) {
  return (
    <form onSubmit={handleVerSubmit} className="space-y-5">
      {/* Type selector */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">{t('verSelectType')}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setVerType('escort')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              verType === 'escort'
                ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent)/0.08)]'
                : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent)/0.5)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-pink-500" />
              <span className="font-semibold text-sm">{t('verTypeEscort')}</span>
            </div>
            <p className="text-xs forum-text-muted">{t('verTypeEscortDesc')}</p>
          </button>
          <button
            type="button"
            onClick={() => setVerType('moderator')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              verType === 'moderator'
                ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent)/0.08)]'
                : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent)/0.5)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="font-semibold text-sm">{t('verTypeMod')}</span>
            </div>
            <p className="text-xs forum-text-muted">{t('verTypeModDesc')}</p>
          </button>
        </div>
      </div>

      {/* --- ESCORT FORM --- */}
      {verType === 'escort' && (
        <div className="space-y-4 border-t border-[hsl(var(--forum-border))] pt-4">
          <div className="p-3 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded-lg">
            <h4 className="text-sm font-semibold mb-1">{t('verEscortTitle')}</h4>
            <p className="text-xs forum-text-muted">{t('verEscortInstructions')}</p>
          </div>

          {/* Step 1: Generate code */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm">{t('verStep1')}</Label>
            <p className="text-xs forum-text-muted">
              {t('verStep1Desc', { username: profile.username })}
            </p>
            {!verCode ? (
              <Button type="button" onClick={generateCode} variant="outline" size="sm">
                {t('verGenerateCode')}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-[hsl(var(--forum-surface-alt))] border-2 border-[hsl(var(--forum-accent))] rounded-lg">
                <span className="text-lg font-mono font-bold flex-1">{verCode}</span>
                <Button type="button" variant="outline" size="sm" onClick={copyCode}>
                  {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          {verCode && (
            <>
              {/* Step 2: Photo instructions */}
              <div className="space-y-2">
                <Label className="font-semibold text-sm">{t('verStep2')}</Label>
                <p className="text-xs forum-text-muted">{t('verStep2Desc')}</p>
                <ul className="text-xs forum-text-muted list-disc list-inside space-y-1 ml-2">
                  <li>{t('verStep2Item1', { code: verCode })}</li>
                  <li>{t('verStep2Item2', { username: profile.username })}</li>
                  <li>{t('verStep2Item3', { date: new Date().toLocaleDateString() })}</li>
                </ul>
              </div>

              {/* Step 3: Photo URL */}
              <div className="space-y-2">
                <Label htmlFor="verPhotoUrl" className="font-semibold text-sm">{t('verStep3')}</Label>
                <p className="text-xs forum-text-muted">{t('verStep3Desc')}</p>
                <Input
                  id="verPhotoUrl"
                  type="url"
                  placeholder="https://imgur.com/..."
                  value={verPhotoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerPhotoUrl(e.target.value)}
                  disabled={verSubmitting}
                  required
                />
              </div>

              {/* Optional: contact info */}
              <div className="space-y-2">
                <Label htmlFor="verContactInfo" className="text-sm">{t('verContactInfo')}</Label>
                <Input
                  id="verContactInfo"
                  placeholder={t('verContactInfoPlaceholder')}
                  value={verContactInfo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerContactInfo(e.target.value)}
                  disabled={verSubmitting}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* --- MODERATOR FORM --- */}
      {verType === 'moderator' && (
        <div className="space-y-4 border-t border-[hsl(var(--forum-border))] pt-4">
          <div className="p-3 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded-lg">
            <h4 className="text-sm font-semibold mb-1">{t('verModTitle')}</h4>
            <p className="text-xs forum-text-muted">{t('verModInstructions')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verFullName" className="text-sm">{t('verFullName')} *</Label>
            <Input
              id="verFullName"
              placeholder={t('verFullNamePlaceholder')}
              value={verFullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerFullName(e.target.value)}
              disabled={verSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verMotivation" className="text-sm">{t('verMotivation')} *</Label>
            <Textarea
              id="verMotivation"
              placeholder={t('verMotivationPlaceholder')}
              value={verMotivation}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVerMotivation(e.target.value)}
              disabled={verSubmitting}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verExperience" className="text-sm">{t('verExperience')} *</Label>
            <Textarea
              id="verExperience"
              placeholder={t('verExperiencePlaceholder')}
              value={verExperience}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVerExperience(e.target.value)}
              disabled={verSubmitting}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verLanguages" className="text-sm">{t('verLanguages')}</Label>
            <Input
              id="verLanguages"
              placeholder={t('verLanguagesPlaceholder')}
              value={verLanguages}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerLanguages(e.target.value)}
              disabled={verSubmitting}
            />
            <p className="text-xs forum-text-muted">{t('verLanguagesHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verAvailability" className="text-sm">{t('verAvailability')}</Label>
            <Input
              id="verAvailability"
              placeholder={t('verAvailabilityPlaceholder')}
              value={verAvailability}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerAvailability(e.target.value)}
              disabled={verSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verContactMod" className="text-sm">{t('verContactInfo')}</Label>
            <Input
              id="verContactMod"
              placeholder={t('verContactModPlaceholder')}
              value={verContactInfo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerContactInfo(e.target.value)}
              disabled={verSubmitting}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      {((verType === 'escort' && verCode) || verType === 'moderator') && (
        <Button
          type="submit"
          disabled={verSubmitting}
          className="w-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
        >
          {verSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('verSubmitting')}</>
          ) : (
            t('verSubmitRequest')
          )}
        </Button>
      )}
    </form>
  );
}
