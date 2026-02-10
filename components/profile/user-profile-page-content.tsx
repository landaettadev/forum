'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Calendar, MapPin, Award, Clock, UserPlus, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { UserRating } from '@/components/user/user-rating';
import { ProfileBadges } from '@/components/user/profile-badges';
import { CustomBadges } from '@/components/user/custom-badges';

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  signature: string | null;
  role: string;
  is_verified: boolean;
  is_vip: boolean;
  posts_count: number;
  threads_count: number;
  thanks_received: number;
  points: number;
  activity_badge: string | null;
  likes_received: number;
  dislikes_received: number;
  warning_points: number;
  is_escort: boolean;
  escort_verified_at: string | null;
  moderator_type: string | null;
  location_city: string | null;
  location_country: string | null;
  created_at: string;
  last_seen_at: string | null;
};

type Thread = {
  id: string;
  title: string;
  created_at: string;
  replies_count: number;
  forum: { name: string; slug: string };
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  thread: { id: string; title: string };
};

interface UserProfilePageContentProps {
  profile: Profile;
  threads: Thread[];
  recentPosts: Post[];
  threadsCount: number;
  followersCount: number;
  followingCount: number;
}

export function UserProfilePageContent({
  profile,
  threads,
  recentPosts,
  threadsCount,
  followersCount,
  followingCount,
}: UserProfilePageContentProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Banner Section */}
      <div className="relative h-48 rounded-t-lg overflow-hidden bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))]">
        {profile.banner_url && (
          <img 
            src={profile.banner_url} 
            alt="Banner" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Profile Card */}
      <div className="forum-surface rounded-t-none p-6 mb-6 -mt-16 relative">
        <div className="flex gap-6">
          <div className="relative -mt-20">
            <Avatar className="h-32 w-32 border-4 border-[hsl(var(--forum-surface))] shadow-lg">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-4xl">
                {getUserInitials(profile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 border-2 border-[hsl(var(--forum-surface))]" />
          </div>

          <div className="flex-1 pt-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{profile.username}</h1>
                </div>
                
                {/* Automatic badges based on profile data */}
                <ProfileBadges 
                  profile={{
                    id: profile.id,
                    role: profile.role,
                    moderator_type: profile.moderator_type,
                    is_verified: profile.is_verified,
                    is_vip: profile.is_vip,
                    is_escort: profile.is_escort,
                    escort_verified_at: profile.escort_verified_at,
                    likes_received: profile.likes_received || 0,
                    dislikes_received: profile.dislikes_received || 0,
                    posts_count: profile.posts_count || 0,
                    threads_count: profile.threads_count || 0,
                    thanks_received: profile.thanks_received || 0,
                    created_at: profile.created_at,
                    points: profile.points || 0
                  }}
                  size="md"
                  maxBadges={8}
                />
                
                {/* Custom assigned badges */}
                <div className="mt-2">
                  <CustomBadges userId={profile.id} size="md" />
                </div>

                <div className="flex items-center gap-4 text-sm forum-text-secondary mb-3 mt-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{t('memberSince')} {new Date(profile.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</span>
                  </div>
                  {profile.location_city && profile.location_country && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location_city}, {profile.location_country}</span>
                    </div>
                  )}
                  {profile.last_seen_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{t('lastSeen')}: {formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true, locale: dateLocale })}</span>
                    </div>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-sm forum-text-secondary mb-4 max-w-2xl">{profile.bio}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <UserPlus className="h-4 w-4" />
                  {t('follow')}
                </Button>
                <Button asChild size="sm" className="gap-1 bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white">
                  <Link href={`/mensajes/${profile.id}`}>
                    <MessageSquare className="h-4 w-4" />
                    {t('sendMessage')}
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-8 mt-4 pt-4 border-t border-[hsl(var(--forum-border))]">
              <div className="text-center">
                <div className="text-2xl font-bold">{profile.posts_count}</div>
                <div className="text-xs forum-text-muted">{t('posts')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{threadsCount || 0}</div>
                <div className="text-xs forum-text-muted">{t('threads')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{profile.thanks_received || 0}</div>
                <div className="text-xs forum-text-muted">{t('reactions')}</div>
              </div>
              <div className="text-center cursor-pointer hover:text-[hsl(var(--forum-accent))]">
                <div className="text-2xl font-bold">{followersCount || 0}</div>
                <div className="text-xs forum-text-muted">{t('followers')}</div>
              </div>
              <div className="text-center cursor-pointer hover:text-[hsl(var(--forum-accent))]">
                <div className="text-2xl font-bold">{followingCount || 0}</div>
                <div className="text-xs forum-text-muted">{t('following')}</div>
              </div>
              <div className="text-center border-l border-[hsl(var(--forum-border))] pl-8">
                <UserRating 
                  userId={profile.id}
                  likesCount={profile.likes_received || 0}
                  dislikesCount={profile.dislikes_received || 0}
                  size="lg"
                />
                <div className="text-xs forum-text-muted mt-1">{t('reputation')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="activity" className="forum-surface">
        <TabsList className="w-full justify-start border-b border-[hsl(var(--forum-border))] rounded-none bg-transparent p-0">
          <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent px-6 py-3">
            {t('recentActivity')}
          </TabsTrigger>
          <TabsTrigger value="threads" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent px-6 py-3">
            {t('threads')}
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent px-6 py-3">
            {t('publications')}
          </TabsTrigger>
          <TabsTrigger value="about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent px-6 py-3">
            {t('about')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="p-6">
          <h3 className="font-semibold mb-4">{t('recentActivity')}</h3>
          {recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-4">
              {recentPosts.map((post: any) => (
                <div key={post.id} className="flex gap-3 pb-4 border-b border-[hsl(var(--forum-border))] last:border-b-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-[hsl(var(--forum-accent))] text-white">
                      {getUserInitials(profile.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{profile.username}</span> {t('repliedIn')}{' '}
                      <Link href={`/hilo/${post.thread?.id}`} className="text-[hsl(var(--forum-accent))] hover:underline">
                        {post.thread?.title}
                      </Link>
                    </p>
                    <p className="text-xs forum-text-muted mt-1">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center forum-text-muted py-8">{t('noRecentActivity')}</p>
          )}
        </TabsContent>

        <TabsContent value="threads" className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
            {t('threadsCreated')} ({threadsCount || 0})
          </h3>
          {threads && threads.length > 0 ? (
            <div className="space-y-3">
              {threads.map((thread: any) => (
                <div key={thread.id} className="pb-3 border-b border-[hsl(var(--forum-border))] last:border-b-0">
                  <Link
                    href={`/hilo/${thread.id}`}
                    className="font-semibold hover:text-[hsl(var(--forum-accent))] transition-colors"
                  >
                    {thread.title}
                  </Link>
                  <div className="text-sm forum-text-muted mt-1">
                    {t('in')}{' '}
                    <Link
                      href={`/foro/${thread.forum?.slug}`}
                      className="hover:text-[hsl(var(--forum-accent))]"
                    >
                      {thread.forum?.name}
                    </Link>
                    {' '}• {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true, locale: dateLocale })}
                    {' '}• {thread.replies_count || 0} {t('replies')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center forum-text-muted py-8">
              {t('noThreadsYet')}
            </p>
          )}
        </TabsContent>

        <TabsContent value="posts" className="p-6">
          <h3 className="font-semibold mb-4">{t('publications')} ({profile.posts_count})</h3>
          {recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-4">
              {recentPosts.map((post: any) => (
                <div key={post.id} className="pb-4 border-b border-[hsl(var(--forum-border))] last:border-b-0">
                  <Link href={`/hilo/${post.thread?.id}`} className="font-semibold text-[hsl(var(--forum-accent))] hover:underline">
                    {post.thread?.title}
                  </Link>
                  <p className="text-sm mt-2 forum-text-secondary line-clamp-2">
                    {post.content?.substring(0, 200)}...
                  </p>
                  <p className="text-xs forum-text-muted mt-2">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: dateLocale })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center forum-text-muted py-8">{t('noPosts')}</p>
          )}
        </TabsContent>

        <TabsContent value="about" className="p-6">
          <h3 className="font-semibold mb-4">{t('about')} {profile.username}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm forum-text-muted">{t('memberSince')}</span>
                <p className="font-medium">{new Date(profile.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              {profile.location_country && (
                <div>
                  <span className="text-sm forum-text-muted">{t('location')}</span>
                  <p className="font-medium">{profile.location_city ? `${profile.location_city}, ` : ''}{profile.location_country}</p>
                </div>
              )}
              <div>
                <span className="text-sm forum-text-muted">{t('lastSeen')}</span>
                <p className="font-medium">
                  {profile.last_seen_at 
                    ? formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true, locale: dateLocale })
                    : t('unknown')}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm forum-text-muted">{t('totalPosts')}</span>
                <p className="font-medium">{profile.posts_count}</p>
              </div>
              <div>
                <span className="text-sm forum-text-muted">{t('threadsCreated')}</span>
                <p className="font-medium">{threadsCount || 0}</p>
              </div>
              <div>
                <span className="text-sm forum-text-muted">{t('points')}</span>
                <p className="font-medium">{profile.points || 0}</p>
              </div>
            </div>
          </div>
          {profile.signature && (
            <div className="mt-6 pt-6 border-t border-[hsl(var(--forum-border))]">
              <span className="text-sm forum-text-muted">{t('signature')}</span>
              <p className="mt-1 italic forum-text-secondary">{profile.signature}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
