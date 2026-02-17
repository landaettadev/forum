'use client';

import { useState } from 'react';
import Image from 'next/image';
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
import { ModActions } from '@/components/moderation/mod-actions';
import { FollowButton } from '@/components/user/follow-button';
import { ReportButton } from '@/components/report/report-button';

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
  postsCount: number;
  followersCount: number;
  followingCount: number;
  threadsPage: number;
  postsPage: number;
  pageSize: number;
}

export function UserProfilePageContent({
  profile,
  threads,
  recentPosts,
  threadsCount,
  postsCount,
  followersCount,
  followingCount,
  threadsPage,
  postsPage,
  pageSize,
}: UserProfilePageContentProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('profile');
  const _tCommon = useTranslations('common');
  const [activeTab, setActiveTab] = useState('activity');

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  // Calculate total pages
  const totalThreadPages = Math.ceil((threadsCount || 0) / pageSize);
  const totalPostPages = Math.ceil((postsCount || 0) / pageSize);

  // Generate page numbers array
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <>
      {/* Banner Section */}
      <div className="relative h-32 sm:h-48 rounded-t-lg overflow-hidden bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))]">
        {profile.banner_url && (
          <Image 
            src={profile.banner_url} 
            alt="Banner" 
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Profile Card */}
      <div className="forum-surface rounded-t-none p-4 sm:p-6 mb-6 -mt-12 sm:-mt-16 relative">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="relative -mt-16 sm:-mt-20 flex justify-center sm:justify-start">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-[hsl(var(--forum-surface))] shadow-lg">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-4xl">
                {getUserInitials(profile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 border-2 border-[hsl(var(--forum-surface))]" />
          </div>

          <div className="flex-1 pt-2 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">{profile.username}</h1>
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

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm forum-text-secondary mb-3 mt-3">
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

              <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                <FollowButton 
                  userId={profile.id} 
                  username={profile.username}
                  size="sm"
                  showLabel
                />
                <Button asChild size="sm" className="gap-1 bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white">
                  <Link href={`/mensajes?to=${profile.username}`}>
                    <MessageSquare className="h-4 w-4" />
                    {t('sendMessage')}
                  </Link>
                </Button>
                <ModActions targetUserId={profile.id} />
                <ReportButton 
                  targetUserId={profile.id} 
                  targetUsername={profile.username}
                  size="sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mt-4 pt-4 border-t border-[hsl(var(--forum-border))]">
              <div className="text-center cursor-pointer hover:text-[hsl(var(--forum-accent))] transition-colors p-2 rounded-lg hover:bg-[hsl(var(--forum-surface-alt))]" onClick={() => setActiveTab('posts')}>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{profile.posts_count}</div>
                <div className="text-[10px] sm:text-xs forum-text-muted">{t('posts')}</div>
              </div>
              <div className="text-center cursor-pointer hover:text-[hsl(var(--forum-accent))] transition-colors p-2 rounded-lg hover:bg-[hsl(var(--forum-surface-alt))]" onClick={() => setActiveTab('threads')}>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{threadsCount || 0}</div>
                <div className="text-[10px] sm:text-xs forum-text-muted">{t('threads')}</div>
              </div>
              <div className="text-center p-2 rounded-lg">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{profile.thanks_received || 0}</div>
                <div className="text-[10px] sm:text-xs forum-text-muted">{t('reactions')}</div>
              </div>
              <div className="text-center cursor-pointer hover:text-[hsl(var(--forum-accent))] transition-colors p-2 rounded-lg hover:bg-[hsl(var(--forum-surface-alt))]">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{followersCount || 0}</div>
                <div className="text-[10px] sm:text-xs forum-text-muted">{t('followers')}</div>
              </div>
              <div className="text-center cursor-pointer hover:text-[hsl(var(--forum-accent))] transition-colors p-2 rounded-lg hover:bg-[hsl(var(--forum-surface-alt))]">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{followingCount || 0}</div>
                <div className="text-[10px] sm:text-xs forum-text-muted">{t('following')}</div>
              </div>
              <div className="text-center col-span-3 md:col-span-1 border-t md:border-t-0 md:border-l border-[hsl(var(--forum-border))] pt-3 md:pt-0 md:pl-4 lg:pl-6 mt-2 md:mt-0 flex flex-col items-center justify-center">
                <UserRating 
                  userId={profile.id}
                  likesCount={profile.likes_received || 0}
                  dislikesCount={profile.dislikes_received || 0}
                  size="lg"
                />
                <div className="text-[10px] sm:text-xs forum-text-muted mt-1">{t('reputation')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="forum-surface">
        <TabsList className="w-full justify-start border-b border-[hsl(var(--forum-border))] rounded-none bg-transparent p-0 overflow-x-auto scrollbar-none">
          <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
            {t('recentActivity')}
          </TabsTrigger>
          <TabsTrigger value="threads" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
            {t('threads')}
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
            {t('publications')}
          </TabsTrigger>
          <TabsTrigger value="about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--forum-accent))] data-[state=active]:bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
            {t('about')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="p-4 sm:p-6">
          <h3 className="font-semibold mb-4">{t('recentActivity')}</h3>
          {recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-4">
              {recentPosts.map((post: Post) => (
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
              {threads.map((thread: Thread) => (
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
          
          {/* Pagination for Threads */}
          {totalThreadPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-[hsl(var(--forum-border))]">
              <Button
                variant="outline"
                size="sm"
                disabled={threadsPage <= 1}
                asChild
              >
                <Link href={`/user/${profile.username}?threadsPage=${threadsPage - 1}&postsPage=${postsPage}`}>
                  ← Anterior
                </Link>
              </Button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers(threadsPage, totalThreadPages).map((page, idx) => (
                  page === '...' ? (
                    <span key={idx} className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={idx}
                      variant={threadsPage === page ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      asChild
                    >
                      <Link href={`/user/${profile.username}?threadsPage=${page}&postsPage=${postsPage}`}>
                        {page}
                      </Link>
                    </Button>
                  )
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                disabled={threadsPage >= totalThreadPages}
                asChild
              >
                <Link href={`/user/${profile.username}?threadsPage=${threadsPage + 1}&postsPage=${postsPage}`}>
                  Siguiente →
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="p-6">
          <h3 className="font-semibold mb-4">{t('publications')} ({profile.posts_count})</h3>
          {recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-4">
              {recentPosts.map((post: Post) => (
                <div key={post.id} className="pb-4 border-b border-[hsl(var(--forum-border))] last:border-b-0">
                  <Link href={`/hilo/${post.thread?.id}`} className="font-semibold text-[hsl(var(--forum-accent))] hover:underline">
                    {post.thread?.title}
                  </Link>
                  <p className="text-sm mt-2 forum-text-secondary line-clamp-2">
                    {post.content?.replace(/<[^>]*>/g, '').substring(0, 200)}...
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
          
          {/* Pagination for Posts */}
          {totalPostPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-[hsl(var(--forum-border))]">
              <Button
                variant="outline"
                size="sm"
                disabled={postsPage <= 1}
                asChild
              >
                <Link href={`/user/${profile.username}?threadsPage=${threadsPage}&postsPage=${postsPage - 1}`}>
                  ← Anterior
                </Link>
              </Button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers(postsPage, totalPostPages).map((page, idx) => (
                  page === '...' ? (
                    <span key={idx} className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={idx}
                      variant={postsPage === page ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      asChild
                    >
                      <Link href={`/user/${profile.username}?threadsPage=${threadsPage}&postsPage=${page}`}>
                        {page}
                      </Link>
                    </Button>
                  )
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                disabled={postsPage >= totalPostPages}
                asChild
              >
                <Link href={`/user/${profile.username}?threadsPage=${threadsPage}&postsPage=${postsPage + 1}`}>
                  Siguiente →
                </Link>
              </Button>
            </div>
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
              <div
                className="cursor-pointer hover:text-[hsl(var(--forum-accent))] transition-colors rounded-lg hover:bg-[hsl(var(--forum-surface-alt))] p-2 -m-2"
                onClick={() => setActiveTab('posts')}
              >
                <span className="text-sm forum-text-muted">{t('totalPosts')}</span>
                <p className="font-medium text-[hsl(var(--forum-accent))]">{profile.posts_count}</p>
              </div>
              <div
                className="cursor-pointer hover:text-[hsl(var(--forum-accent))] transition-colors rounded-lg hover:bg-[hsl(var(--forum-surface-alt))] p-2 -m-2"
                onClick={() => setActiveTab('threads')}
              >
                <span className="text-sm forum-text-muted">{t('threadsCreated')}</span>
                <p className="font-medium text-[hsl(var(--forum-accent))]">{threadsCount || 0}</p>
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
