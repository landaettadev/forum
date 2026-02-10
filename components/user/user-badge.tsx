'use client';

import { useTranslations } from 'next-intl';
import { Award, Star, Flame, Crown, Shield, ShieldCheck } from 'lucide-react';

interface UserBadgeProps {
  activityBadge?: string | null;
  role?: string;
  showRoleBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const activityBadgeConfig = {
  newbie: {
    icon: Star,
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    labelKey: 'newbie'
  },
  active: {
    icon: Flame,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    labelKey: 'active'
  },
  veteran: {
    icon: Award,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    labelKey: 'veteran'
  },
  legend: {
    icon: Crown,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    labelKey: 'legend'
  }
};

const roleBadgeConfig = {
  admin: {
    icon: ShieldCheck,
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    labelKey: 'admin'
  },
  moderator: {
    icon: Shield,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    labelKey: 'moderator'
  }
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-2.5 py-1.5 gap-2'
};

const iconSizes = {
  sm: 10,
  md: 12,
  lg: 14
};

export function UserBadge({ activityBadge, role, showRoleBadge = true, size = 'md' }: UserBadgeProps) {
  const t = useTranslations('badges');

  const badges = [];

  // Role badge (admin/moderator) - takes priority
  if (showRoleBadge && role && roleBadgeConfig[role as keyof typeof roleBadgeConfig]) {
    const config = roleBadgeConfig[role as keyof typeof roleBadgeConfig];
    const Icon = config.icon;
    badges.push(
      <span
        key={`role-${role}`}
        className={`inline-flex items-center ${sizeClasses[size]} font-medium rounded-full border ${config.color}`}
      >
        <Icon size={iconSizes[size]} />
        <span>{t(config.labelKey)}</span>
      </span>
    );
  }

  // Activity badge
  if (activityBadge && activityBadgeConfig[activityBadge as keyof typeof activityBadgeConfig]) {
    const config = activityBadgeConfig[activityBadge as keyof typeof activityBadgeConfig];
    const Icon = config.icon;
    badges.push(
      <span
        key={`activity-${activityBadge}`}
        className={`inline-flex items-center ${sizeClasses[size]} font-medium rounded-full border ${config.color}`}
      >
        <Icon size={iconSizes[size]} />
        <span>{t(config.labelKey)}</span>
      </span>
    );
  }

  if (badges.length === 0) return null;

  return <div className="inline-flex items-center gap-1.5 flex-wrap">{badges}</div>;
}

export function ActivityBadge({ badge, size = 'md' }: { badge: string; size?: 'sm' | 'md' | 'lg' }) {
  const t = useTranslations('badges');
  
  if (!badge || !activityBadgeConfig[badge as keyof typeof activityBadgeConfig]) {
    return null;
  }

  const config = activityBadgeConfig[badge as keyof typeof activityBadgeConfig];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} font-medium rounded-full border ${config.color}`}
    >
      <Icon size={iconSizes[size]} />
      <span>{t(config.labelKey)}</span>
    </span>
  );
}

export function RoleBadge({ role, size = 'md' }: { role: string; size?: 'sm' | 'md' | 'lg' }) {
  const t = useTranslations('badges');
  
  if (!role || !roleBadgeConfig[role as keyof typeof roleBadgeConfig]) {
    return null;
  }

  const config = roleBadgeConfig[role as keyof typeof roleBadgeConfig];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} font-medium rounded-full border ${config.color}`}
    >
      <Icon size={iconSizes[size]} />
      <span>{t(config.labelKey)}</span>
    </span>
  );
}
