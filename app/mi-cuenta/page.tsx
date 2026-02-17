'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase, type Profile } from '@/lib/supabase';
import { updateProfile, updateNotificationSettings, updatePrivacySettings, submitVerificationRequest } from './actions';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { MessageSquare, Eye, Clock, Upload, X, User, Bell, Shield, Lock, Copy, Check, Loader2 } from 'lucide-react';
import { uploadAvatar } from '@/lib/storage';

function MisHilos({ userId }: { userId: string }) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('account');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      const { data } = await supabase
        .from('threads')
        .select('*, forum:forums(name, slug)')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      setThreads(data || []);
      setLoading(false);
    };

    fetchThreads();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center forum-text-muted">
          {t('saving').replace('...', '')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('myThreads')}</CardTitle>
        <CardDescription>{t('threadsCreated')}</CardDescription>
      </CardHeader>
      <CardContent>
        {threads.length === 0 ? (
          <div className="text-center py-8 forum-text-muted">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('noThreadsCreated')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => (
              <div key={thread.id} className="p-3 border border-[hsl(var(--forum-border))] rounded hover:bg-[hsl(var(--forum-surface-alt))] transition-colors">
                <Link href={`/hilo/${thread.id}`} className="font-semibold hover:text-[hsl(var(--forum-accent))]">
                  {thread.title}
                </Link>
                <div className="flex items-center gap-4 mt-2 text-xs forum-text-muted">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {thread.replies_count} {t('replies')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {thread.views_count} {t('views')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
                <div className="text-xs forum-text-secondary mt-1">
                  {t('inForum')} <Link href={`/foro/${thread.forum?.slug}`} className="hover:text-[hsl(var(--forum-accent))]">{thread.forum?.name}</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function SettingsTab({ profile, refreshProfile }: { profile: Profile; refreshProfile: () => Promise<void> }) {
  const t = useTranslations('account');

  // --- Notification settings ---
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    notify_replies: profile.notify_replies ?? true,
    notify_mentions: profile.notify_mentions ?? true,
    notify_messages: profile.notify_messages ?? true,
    notify_follows: profile.notify_follows ?? true,
    notify_email_replies: profile.notify_email_replies ?? false,
    notify_email_messages: profile.notify_email_messages ?? false,
  });

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    try {
      const result = await updateNotificationSettings(notifSettings);
      if (result.success) {
        toast.success(t('settingsSaved'));
        await refreshProfile();
      } else {
        toast.error(t('settingsError'), { description: result.error });
      }
    } catch {
      toast.error(t('settingsError'));
    } finally {
      setNotifSaving(false);
    }
  };

  // --- Privacy settings ---
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    privacy_show_online: profile.privacy_show_online ?? true,
    privacy_show_activity: profile.privacy_show_activity ?? true,
    privacy_show_profile: profile.privacy_show_profile ?? true,
    privacy_allow_messages: profile.privacy_allow_messages ?? 'everyone' as 'everyone' | 'verified' | 'nobody',
  });

  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    try {
      const result = await updatePrivacySettings(privacySettings);
      if (result.success) {
        toast.success(t('settingsSaved'));
        await refreshProfile();
      } else {
        toast.error(t('settingsError'), { description: result.error });
      }
    } catch {
      toast.error(t('settingsError'));
    } finally {
      setPrivacySaving(false);
    }
  };

  // --- Verification ---
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
    if (!profile?.id) return;
    setVerLoading(true);
    const { data } = await supabase
      .from('verifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setVerification(data);
    setVerLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

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

  return (
    <div className="space-y-6">
      {/* --- NOTIFICATIONS --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
            {t('notifications')}
          </CardTitle>
          <CardDescription>{t('notificationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold forum-text-secondary">{t('notifInApp')}</h4>
            {([
              ['notify_replies', t('notifReplies'), t('notifRepliesDesc')],
              ['notify_mentions', t('notifMentions'), t('notifMentionsDesc')],
              ['notify_messages', t('notifMessages'), t('notifMessagesDesc')],
              ['notify_follows', t('notifFollows'), t('notifFollowsDesc')],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs forum-text-muted">{desc}</p>
                </div>
                <Switch
                  checked={notifSettings[key]}
                  onCheckedChange={(v) => setNotifSettings({ ...notifSettings, [key]: v })}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-[hsl(var(--forum-border))] pt-4 space-y-4">
            <h4 className="text-sm font-semibold forum-text-secondary">{t('notifEmail')}</h4>
            {([
              ['notify_email_replies', t('notifEmailReplies'), t('notifEmailRepliesDesc')],
              ['notify_email_messages', t('notifEmailMessages'), t('notifEmailMessagesDesc')],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs forum-text-muted">{desc}</p>
                </div>
                <Switch
                  checked={notifSettings[key]}
                  onCheckedChange={(v) => setNotifSettings({ ...notifSettings, [key]: v })}
                />
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveNotifications}
            disabled={notifSaving}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
          >
            {notifSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      {/* --- PRIVACY --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
            {t('privacy')}
          </CardTitle>
          <CardDescription>{t('privacyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {([
            ['privacy_show_online', t('privShowOnline'), t('privShowOnlineDesc')],
            ['privacy_show_activity', t('privShowActivity'), t('privShowActivityDesc')],
            ['privacy_show_profile', t('privShowProfile'), t('privShowProfileDesc')],
          ] as const).map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs forum-text-muted">{desc}</p>
              </div>
              <Switch
                checked={privacySettings[key] as boolean}
                onCheckedChange={(v) => setPrivacySettings({ ...privacySettings, [key]: v })}
              />
            </div>
          ))}

          <div className="border-t border-[hsl(var(--forum-border))] pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('privAllowMessages')}</Label>
              <p className="text-xs forum-text-muted">{t('privAllowMessagesDesc')}</p>
              <select
                value={privacySettings.privacy_allow_messages}
                onChange={(e) => setPrivacySettings({ ...privacySettings, privacy_allow_messages: e.target.value as 'everyone' | 'verified' | 'nobody' })}
                className="w-full sm:w-64 rounded-md border border-[hsl(var(--forum-border))] bg-[hsl(var(--forum-surface))] px-3 py-2 text-sm"
              >
                <option value="everyone">{t('privMsgEveryone')}</option>
                <option value="nobody">{t('privMsgNobody')}</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleSavePrivacy}
            disabled={privacySaving}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
          >
            {privacySaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      {/* --- VERIFICATION --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
            {t('verification')}
          </CardTitle>
          <CardDescription>{t('verificationDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {profile.is_verified ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="h-6 w-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">{t('verAlreadyVerified')}</p>
                <p className="text-sm forum-text-muted">{t('verAlreadyVerifiedDesc')}</p>
              </div>
            </div>
          ) : verLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin forum-text-muted" />
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
                  onChange={(e) => setVerPhotoUrl(e.target.value)}
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
                  onChange={(e) => setVerContactInfo(e.target.value)}
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
              onChange={(e) => setVerFullName(e.target.value)}
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
              onChange={(e) => setVerLanguages(e.target.value)}
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
              onChange={(e) => setVerAvailability(e.target.value)}
              disabled={verSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verContactMod" className="text-sm">{t('verContactInfo')}</Label>
            <Input
              id="verContactMod"
              placeholder={t('verContactModPlaceholder')}
              value={verContactInfo}
              onChange={(e) => setVerContactInfo(e.target.value)}
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


export default function MiCuentaPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const t = useTranslations('account');
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    signature: '',
    location_country: '',
    location_city: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (profile) {
      setFormData({
        username: profile.username,
        bio: profile.bio || '',
        signature: profile.signature || '',
        location_country: profile.location_country || '',
        location_city: profile.location_city || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [user, profile, router, authLoading]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const result = await updateProfile({
        bio: formData.bio,
        signature: formData.signature,
        location_country: formData.location_country,
        location_city: formData.location_city,
        avatar_url: formData.avatar_url || undefined,
      });

      if (!result.success) {
        toast.error(t('updateError'), {
          description: result.error,
        });
        return;
      }

      await refreshProfile();
      toast.success(t('updateSuccess'));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : undefined;
      toast.error(t('updateError'), {
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs items={[{ label: t('title') }]} />

        <div className="flex gap-6">
          <main className="flex-1">
            <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>

            <Tabs defaultValue="perfil" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="perfil">{t('profileTab')}</TabsTrigger>
                <TabsTrigger value="hilos">{t('threadsTab')}</TabsTrigger>
                <TabsTrigger value="configuracion">{t('settingsTab')}</TabsTrigger>
              </TabsList>

              <TabsContent value="perfil">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('editProfile')}</CardTitle>
                    <CardDescription>
                      {t('updateInfo')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">{t('username')}</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          disabled
                          className="opacity-60"
                        />
                        <p className="text-xs forum-text-muted">
                          {t('usernameNoChange')}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label>{t('avatarUpload')}</Label>
                        <div className="flex items-start gap-4">
                          {/* Avatar preview */}
                          <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[hsl(var(--forum-border))] bg-[hsl(var(--forum-muted))] flex items-center justify-center">
                              {(avatarPreview || formData.avatar_url) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={avatarPreview || formData.avatar_url}
                                  alt="Avatar"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <User className="w-8 h-8 text-[hsl(var(--forum-muted-foreground))]" />
                              )}
                            </div>
                            {(avatarPreview || formData.avatar_url) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAvatarPreview(null);
                                  setFormData({ ...formData, avatar_url: '' });
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Upload area */}
                          <div className="flex-1 space-y-2">
                            <label
                              htmlFor="avatar_file"
                              className={`
                                flex flex-col items-center justify-center w-full py-4 px-4
                                border-2 border-dashed border-[hsl(var(--forum-border))] rounded-lg
                                cursor-pointer transition-colors
                                hover:border-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent)/0.05)]
                                ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}
                              `}
                            >
                              {avatarUploading ? (
                                <div className="flex items-center gap-2 text-sm forum-text-secondary">
                                  <div className="w-4 h-4 border-2 border-[hsl(var(--forum-accent))] border-t-transparent rounded-full animate-spin" />
                                  {t('avatarUploading')}
                                </div>
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 mb-1 text-[hsl(var(--forum-muted-foreground))]" />
                                  <span className="text-sm forum-text-secondary">{t('avatarDragDrop')}</span>
                                  <span className="text-xs forum-text-muted mt-1">{t('avatarMaxSize')}</span>
                                </>
                              )}
                              <input
                                id="avatar_file"
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                disabled={avatarUploading || loading}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file || !user) return;

                                  // Preview immediately
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                                  reader.readAsDataURL(file);

                                  // Upload
                                  setAvatarUploading(true);
                                  try {
                                    const result = await uploadAvatar(file, user.id);
                                    if (result.success && result.url) {
                                      setFormData(prev => ({ ...prev, avatar_url: result.url! }));
                                      setAvatarPreview(null);
                                      toast.success(t('avatarUploadSuccess'));
                                    } else {
                                      toast.error(t('avatarUploadError'), { description: result.error });
                                      setAvatarPreview(null);
                                    }
                                  } catch {
                                    toast.error(t('avatarUploadError'));
                                    setAvatarPreview(null);
                                  } finally {
                                    setAvatarUploading(false);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>

                            {/* URL input toggle */}
                            <div>
                              <button
                                type="button"
                                onClick={() => setShowUrlInput(!showUrlInput)}
                                className="text-xs text-[hsl(var(--forum-accent))] hover:underline"
                              >
                                {t('avatarOrUrl')}
                              </button>
                              {showUrlInput && (
                                <Input
                                  type="url"
                                  placeholder="https://..."
                                  value={formData.avatar_url}
                                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                  disabled={loading}
                                  className="mt-2"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">{t('bio')}</Label>
                        <Textarea
                          id="bio"
                          placeholder={t('bioPlaceholder')}
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          disabled={loading}
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signature">{t('signature')}</Label>
                        <Textarea
                          id="signature"
                          placeholder={t('signaturePlaceholder')}
                          value={formData.signature}
                          onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                          disabled={loading}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location_country">{t('country')}</Label>
                          <Input
                            id="location_country"
                            placeholder={t('countryPlaceholder')}
                            value={formData.location_country}
                            onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location_city">{t('city')}</Label>
                          <Input
                            id="location_city"
                            placeholder={t('cityPlaceholder')}
                            value={formData.location_city}
                            onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
                      >
                        {loading ? t('saving') : t('saveChanges')}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hilos">
                <MisHilos userId={user.id} />
              </TabsContent>

              <TabsContent value="configuracion">
                <SettingsTab profile={profile} refreshProfile={refreshProfile} />
              </TabsContent>
            </Tabs>
          </main>

          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
