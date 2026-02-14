'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Mail, Shield, ShieldCheck, Crown, BadgeCheck, Gem, Star, 
  Award, ThumbsUp, MessageSquare, Flame, Heart,
  Users, TrendingUp, Sparkles, Trophy, Medal, Zap
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ProfileData {
  id: string;
  email_confirmed_at?: string | null;
  role: string;
  moderator_type?: string | null;
  is_verified: boolean;
  is_vip: boolean;
  is_escort: boolean;
  escort_verified_at?: string | null;
  likes_received: number;
  dislikes_received: number;
  posts_count: number;
  threads_count: number;
  thanks_received: number;
  created_at: string;
  points?: number;
}

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface AutoBadge {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  condition: (profile: ProfileData) => boolean;
  priority: number; // Lower = higher priority (shows first)
  category: 'system' | 'role' | 'verification' | 'reputation' | 'activity' | 'special';
}

// Define all automatic badges - names/descriptions are translation keys
const AUTO_BADGES: AutoBadge[] = [
  // === SYSTEM BADGES ===
  {
    id: 'email_verified',
    icon: Mail,
    colorClass: 'bg-sky-500 hover:bg-sky-600',
    condition: (p) => !!p.email_confirmed_at,
    priority: 100,
    category: 'system'
  },

  // === ROLE BADGES ===
  {
    id: 'admin',
    icon: Crown,
    colorClass: 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600',
    condition: (p) => p.role === 'admin',
    priority: 1,
    category: 'role'
  },
  {
    id: 'super_mod',
    icon: ShieldCheck,
    colorClass: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    condition: (p) => p.role === 'mod' && p.moderator_type === 'super',
    priority: 2,
    category: 'role'
  },
  {
    id: 'moderator',
    icon: Shield,
    colorClass: 'bg-blue-600 hover:bg-blue-700',
    condition: (p) => p.role === 'mod' && p.moderator_type !== 'super',
    priority: 3,
    category: 'role'
  },

  // === VERIFICATION BADGES ===
  {
    id: 'verified_account',
    icon: BadgeCheck,
    colorClass: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
    condition: (p) => p.is_verified,
    priority: 10,
    category: 'verification'
  },
  {
    id: 'vip',
    icon: Star,
    colorClass: 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black',
    condition: (p) => p.is_vip,
    priority: 11,
    category: 'verification'
  },

  // === ESCORT BADGES ===
  {
    id: 'escort',
    icon: Gem,
    colorClass: 'bg-fuchsia-500 hover:bg-fuchsia-600',
    condition: (p) => p.is_escort && !p.escort_verified_at,
    priority: 20,
    category: 'special'
  },
  {
    id: 'escort_verified',
    icon: Gem,
    colorClass: 'bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600',
    condition: (p) => p.is_escort && !!p.escort_verified_at,
    priority: 19,
    category: 'special'
  },
  {
    id: 'escort_top_rated',
    icon: Trophy,
    colorClass: 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black',
    condition: (p) => {
      if (!p.is_escort) return false;
      const total = p.likes_received + p.dislikes_received;
      if (total < 10) return false;
      return (p.likes_received / total) >= 0.9;
    },
    priority: 18,
    category: 'special'
  },

  // === REPUTATION BADGES ===
  {
    id: 'trusted',
    icon: ThumbsUp,
    colorClass: 'bg-green-500 hover:bg-green-600',
    condition: (p) => p.likes_received >= 50,
    priority: 30,
    category: 'reputation'
  },
  {
    id: 'highly_rated',
    icon: Heart,
    colorClass: 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600',
    condition: (p) => p.likes_received >= 100,
    priority: 29,
    category: 'reputation'
  },
  {
    id: 'legendary',
    icon: Flame,
    colorClass: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
    condition: (p) => p.likes_received >= 500,
    priority: 28,
    category: 'reputation'
  },

  // === ACTIVITY BADGES ===
  {
    id: 'active_poster',
    icon: MessageSquare,
    colorClass: 'bg-indigo-500 hover:bg-indigo-600',
    condition: (p) => p.posts_count >= 50,
    priority: 40,
    category: 'activity'
  },
  {
    id: 'prolific_writer',
    icon: Zap,
    colorClass: 'bg-violet-500 hover:bg-violet-600',
    condition: (p) => p.posts_count >= 200,
    priority: 39,
    category: 'activity'
  },
  {
    id: 'thread_creator',
    icon: TrendingUp,
    colorClass: 'bg-teal-500 hover:bg-teal-600',
    condition: (p) => (p.threads_count || 0) >= 20,
    priority: 41,
    category: 'activity'
  },
  {
    id: 'veteran',
    icon: Medal,
    colorClass: 'bg-slate-500 hover:bg-slate-600',
    condition: (p) => {
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      return (Date.now() - new Date(p.created_at).getTime()) > oneYear;
    },
    priority: 42,
    category: 'activity'
  },
  {
    id: 'founding_member',
    icon: Sparkles,
    colorClass: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
    condition: (p) => {
      const threeMonths = 90 * 24 * 60 * 60 * 1000;
      const forumLaunch = new Date('2026-01-01').getTime();
      return new Date(p.created_at).getTime() < (forumLaunch + threeMonths);
    },
    priority: 35,
    category: 'activity'
  },
  {
    id: 'helpful',
    icon: Award,
    colorClass: 'bg-emerald-500 hover:bg-emerald-600',
    condition: (p) => (p.thanks_received || 0) >= 100,
    priority: 43,
    category: 'activity'
  },
  {
    id: 'community_pillar',
    icon: Users,
    colorClass: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
    condition: (p) => (p.points || 0) >= 1000,
    priority: 36,
    category: 'activity'
  }
];

const sizeClasses: Record<BadgeSize, { badge: string; icon: string }> = {
  xs: { badge: 'text-[9px] px-1 py-0.5 gap-0.5', icon: 'h-2.5 w-2.5' },
  sm: { badge: 'text-[10px] px-1.5 py-0.5 gap-0.5', icon: 'h-3 w-3' },
  md: { badge: 'text-xs px-2 py-1 gap-1', icon: 'h-3.5 w-3.5' },
  lg: { badge: 'text-sm px-2.5 py-1 gap-1.5', icon: 'h-4 w-4' }
};

interface ProfileBadgesProps {
  profile: ProfileData;
  size?: BadgeSize;
  maxBadges?: number;
  showTooltips?: boolean;
  categories?: AutoBadge['category'][];
  layout?: 'inline' | 'wrap';
}

export function ProfileBadges({ 
  profile, 
  size = 'sm',
  maxBadges = 10,
  showTooltips = true,
  categories,
  layout = 'wrap'
}: ProfileBadgesProps) {
  const t = useTranslations('autoBadges');
  
  // Get all badges that match the profile
  const activeBadges = AUTO_BADGES
    .filter(badge => {
      if (categories && !categories.includes(badge.category)) return false;
      return badge.condition(profile);
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxBadges);

  if (activeBadges.length === 0) return null;

  const layoutClass = layout === 'inline' ? 'inline-flex' : 'flex flex-wrap';

  return (
    <div className={`${layoutClass} items-center gap-1`}>
      {activeBadges.map((badge) => {
        const Icon = badge.icon;
        const badgeName = t(`${badge.id}.name`);
        const badgeDesc = t(`${badge.id}.description`);
        
        const badgeElement = (
          <Badge 
            key={badge.id}
            className={`${badge.colorClass} ${sizeClasses[size].badge} flex items-center cursor-default font-medium`}
          >
            <Icon className={sizeClasses[size].icon} />
            <span>{badgeName}</span>
          </Badge>
        );

        if (showTooltips) {
          return (
            <TooltipProvider key={badge.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {badgeElement}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-sm font-medium">{badgeName}</p>
                  <p className="text-xs text-muted-foreground">{badgeDesc}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return badgeElement;
      })}
    </div>
  );
}

// Compact version for thread rows and comments
interface CompactBadgesProps {
  profile: ProfileData;
  size?: BadgeSize;
}

export function CompactBadges({ profile, size = 'xs' }: CompactBadgesProps) {
  // Show only the most important badges in compact view
  const priorityCategories: AutoBadge['category'][] = ['role', 'verification', 'special'];
  
  return (
    <ProfileBadges 
      profile={profile} 
      size={size} 
      maxBadges={4} 
      showTooltips={true}
      categories={priorityCategories}
      layout="inline"
    />
  );
}

// Single badge component for specific use cases
interface SingleBadgeProps {
  badgeId: string;
  size?: BadgeSize;
  showTooltip?: boolean;
}

export function SingleBadge({ badgeId, size = 'sm', showTooltip = true }: SingleBadgeProps) {
  const t = useTranslations('autoBadges');
  const badge = AUTO_BADGES.find(b => b.id === badgeId);
  if (!badge) return null;

  const Icon = badge.icon;
  const badgeName = t(`${badge.id}.name`);
  const badgeDesc = t(`${badge.id}.description`);
  
  const badgeElement = (
    <Badge 
      className={`${badge.colorClass} ${sizeClasses[size].badge} flex items-center cursor-default font-medium`}
    >
      <Icon className={sizeClasses[size].icon} />
      <span>{badgeName}</span>
    </Badge>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeElement}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{badgeDesc}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeElement;
}

// Export badge definitions for admin panel
export { AUTO_BADGES };
export type { AutoBadge, ProfileData };
