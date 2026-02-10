'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Calendar, MapPin, Award, Clock, Users, UserPlus, Ban, Flag, Settings, Camera } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  signature: string | null;
  role: string;
  is_verified: boolean;
  is_vip: boolean;
  posts_count: number;
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

interface UserProfileContentProps {
  profile: Profile;
  threads: Thread[];
  recentPosts: Post[];
  threadsCount: number;
  followersCount: number;
  followingCount: number;
}

export function UserProfileContent({
  profile,
  threads,
  recentPosts,
  threadsCount,
  followersCount,
  followingCount,
}: UserProfileContentProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('profile');
  const tRoles = useTranslations('roles');

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="forum-surface p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-32 w-32 border-4 border-[hsl(var(--forum-border))]">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white text-3xl">
              {getUserInitials(profile.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-wrap gap-1 justify-center mt-3">
            {profile.role === 'admin' && <span className="badge-admin">{tRoles('roleAdmin')}</span>}
            {profile.role === 'mod' && <span className="badge-mod">{tRoles('roleMod')}</span>}
            {profile.is_vip && <span className="badge-vip">{tRoles('roleVip')}</span>}
            {profile.is_verified && <span className="badge-verified">{tRoles('roleVerified')}</span>}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{profile.username}</h1>

          {profile.bio && (
            <p className="forum-text-secondary mb-4">{profile.bio}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-[hsl(var(--forum-surface-alt))] rounded">
              <div className="text-2xl font-bold text-[hsl(var(--forum-accent))]">
                {profile.posts_count}
              </div>
              <div className="text-xs forum-text-muted">{t('posts')}</div>
            </div>
            <div className="text-center p-3 bg-[hsl(var(--forum-surface-alt))] rounded">
              <div className="text-2xl font-bold text-[hsl(var(--forum-accent))]">
                {threadsCount || 0}
              </div>
              <div className="text-xs forum-text-muted">{t('threads')}</div>
            </div>
            <div className="text-center p-3 bg-[hsl(var(--forum-surface-alt))] rounded">
              <div className="text-2xl font-bold text-[hsl(var(--forum-accent))]">
                {followersCount || 0}
              </div>
              <div className="text-xs forum-text-muted">{t('followers')}</div>
            </div>
            <div className="text-center p-3 bg-[hsl(var(--forum-surface-alt))] rounded">
              <div className="text-2xl font-bold text-[hsl(var(--forum-accent))]">
                {followingCount || 0}
              </div>
              <div className="text-xs forum-text-muted">{t('following')}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm forum-text-secondary">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{t('memberSince')} {new Date(profile.created_at).toLocaleDateString(locale)}</span>
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
        </div>
      </div>
    </div>
  );
}
