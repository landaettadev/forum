'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
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
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { MessageSquare, Eye, Clock } from 'lucide-react';

function MisHilos({ userId }: { userId: string }) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('account');
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
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const t = useTranslations('account');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    signature: '',
    location_country: '',
    location_city: '',
    avatar_url: '',
  });

  useEffect(() => {
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
  }, [user, profile, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: formData.bio,
          signature: formData.signature,
          location_country: formData.location_country,
          location_city: formData.location_city,
          avatar_url: formData.avatar_url,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success(t('updateSuccess'));
    } catch (error: any) {
      toast.error(t('updateError'), {
        description: error.message,
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

                      <div className="space-y-2">
                        <Label htmlFor="avatar_url">{t('avatarUrl')}</Label>
                        <Input
                          id="avatar_url"
                          type="url"
                          placeholder="https://..."
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                          disabled={loading}
                        />
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
    </div>
  );
}
