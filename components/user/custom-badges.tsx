'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, Shield, Trophy, Star, Medal, Award, AlertTriangle, 
  AlertOctagon, Eye, Sparkles, BadgeCheck, Gem, HeartHandshake,
  GraduationCap, RotateCcw, UserX, Handshake, Verified
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface CustomBadge {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string;
  color: string;
  badge_type: 'positive' | 'negative' | 'neutral' | 'special';
}

interface UserCustomBadge {
  id: string;
  badge: CustomBadge;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'crown': Crown,
  'shield-check': Shield,
  'trophy': Trophy,
  'star': Star,
  'medal': Medal,
  'award': Award,
  'alert-triangle': AlertTriangle,
  'alert-octagon': AlertOctagon,
  'eye': Eye,
  'sparkles': Sparkles,
  'badge-check': BadgeCheck,
  'gem': Gem,
  'heart-handshake': HeartHandshake,
  'graduation-cap': GraduationCap,
  'rotate-ccw': RotateCcw,
  'user-x': UserX,
  'handshake': Handshake,
  'verified': Verified,
};

const colorClasses: Record<string, string> = {
  purple: 'bg-purple-500 hover:bg-purple-600',
  green: 'bg-green-500 hover:bg-green-600',
  blue: 'bg-blue-500 hover:bg-blue-600',
  yellow: 'bg-yellow-500 hover:bg-yellow-600 text-black',
  red: 'bg-red-500 hover:bg-red-600',
  orange: 'bg-orange-500 hover:bg-orange-600',
  pink: 'bg-pink-500 hover:bg-pink-600',
  cyan: 'bg-cyan-500 hover:bg-cyan-600',
  fuchsia: 'bg-fuchsia-500 hover:bg-fuchsia-600',
  amber: 'bg-amber-500 hover:bg-amber-600 text-black',
  indigo: 'bg-indigo-500 hover:bg-indigo-600',
  emerald: 'bg-emerald-500 hover:bg-emerald-600',
  violet: 'bg-violet-500 hover:bg-violet-600',
  slate: 'bg-slate-500 hover:bg-slate-600',
  gray: 'bg-gray-500 hover:bg-gray-600',
};

interface CustomBadgesProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  maxBadges?: number;
}

export function CustomBadges({ 
  userId, 
  size = 'sm', 
  showTooltip = true,
  maxBadges = 5
}: CustomBadgesProps) {
  const [badges, setBadges] = useState<UserCustomBadge[]>([]);

  useEffect(() => {
    fetchUserBadges();
  }, [userId]);

  const fetchUserBadges = async () => {
    const { data } = await supabase
      .from('user_custom_badges')
      .select(`
        id,
        badge:custom_badges(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(maxBadges);

    if (data) setBadges(data as unknown as UserCustomBadge[]);
  };

  if (badges.length === 0) return null;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  return (
    <div className="flex flex-wrap gap-1">
      {badges.map(({ badge }) => {
        const IconComponent = iconMap[badge.icon] || Award;
        const colorClass = colorClasses[badge.color] || colorClasses.purple;

        const badgeElement = (
          <Badge 
            key={badge.id}
            className={`${colorClass} ${sizeClasses[size]} flex items-center cursor-default`}
          >
            <IconComponent className={iconSizes[size]} />
            <span>{badge.display_name}</span>
          </Badge>
        );

        if (showTooltip && badge.description) {
          return (
            <TooltipProvider key={badge.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {badgeElement}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{badge.description}</p>
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

// Escort badge component
interface EscortBadgeProps {
  isEscort: boolean;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EscortBadge({ isEscort, isVerified = false, size = 'sm' }: EscortBadgeProps) {
  if (!isEscort) return null;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${sizeClasses[size]} flex items-center gap-1 ${
              isVerified 
                ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600' 
                : 'bg-fuchsia-500/70 hover:bg-fuchsia-600/70'
            }`}
          >
            <Gem className={iconSizes[size]} />
            <span>Escort{isVerified && ' ✓'}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {isVerified ? 'Perfil de escort verificado' : 'Perfil de escort'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Combined badges display for profiles
interface ProfileBadgesProps {
  userId: string;
  isEscort?: boolean;
  escortVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfileBadges({ userId, isEscort, escortVerified, size = 'sm' }: ProfileBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <EscortBadge isEscort={isEscort || false} isVerified={escortVerified} size={size} />
      <CustomBadges userId={userId} size={size} />
    </div>
  );
}
