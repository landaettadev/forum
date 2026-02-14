'use client';

import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { updateProfile } from './actions';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { MessageSquare, Eye, Clock, Upload, X, User } from 'lucide-react';
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
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings')}</CardTitle>
                    <CardDescription>
                      {t('accountSettings')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 border border-[hsl(var(--forum-border))] rounded">
                        <h3 className="font-semibold mb-2">{t('notifications')}</h3>
                        <p className="text-sm forum-text-muted">
                          {t('notificationsDesc')}
                        </p>
                      </div>

                      <div className="p-4 border border-[hsl(var(--forum-border))] rounded">
                        <h3 className="font-semibold mb-2">{t('privacy')}</h3>
                        <p className="text-sm forum-text-muted">
                          {t('privacyDesc')}
                        </p>
                      </div>

                      <div className="p-4 border border-[hsl(var(--forum-border))] rounded">
                        <h3 className="font-semibold mb-2">{t('verification')}</h3>
                        <p className="text-sm forum-text-muted mb-3">
                          {t('verificationDesc')}
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/verificacion">{t('requestVerification')}</a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
