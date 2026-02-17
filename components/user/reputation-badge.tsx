'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type ReputationLevel = 'newbie' | 'member' | 'active' | 'trusted' | 'expert' | 'master' | 'legend';

const LEVEL_CONFIG: Record<ReputationLevel, { 
  key: ReputationLevel; 
  color: string; 
  bgColor: string;
  icon: string;
  minRep: number;
}> = {
  newbie: { 
    key: 'newbie', 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-100',
    icon: '🌱',
    minRep: 0
  },
  member: { 
    key: 'member', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
    icon: '👤',
    minRep: 50
  },
  active: { 
    key: 'active', 
    color: 'text-green-600', 
    bgColor: 'bg-green-100',
    icon: '⚡',
    minRep: 200
  },
  trusted: { 
    key: 'trusted', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    icon: '✓',
    minRep: 500
  },
  expert: { 
    key: 'expert', 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100',
    icon: '🎯',
    minRep: 1000
  },
  master: { 
    key: 'master', 
    color: 'text-red-600', 
    bgColor: 'bg-red-100',
    icon: '🏆',
    minRep: 2500
  },
  legend: { 
    key: 'legend', 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-100',
    icon: '👑',
    minRep: 5000
  },
};

type ReputationBadgeProps = {
  reputation: number;
  level?: string;
  showPoints?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function ReputationBadge({ 
  reputation, 
  level = 'newbie',
  showPoints = true,
  size = 'md' 
}: ReputationBadgeProps) {
  const t = useTranslations('reputation');
  const config = LEVEL_CONFIG[level as ReputationLevel] || LEVEL_CONFIG.newbie;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-3 py-1'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full font-medium",
            config.bgColor,
            config.color,
            sizeClasses[size]
          )}>
            <span>{config.icon}</span>
            {showPoints && <span>{reputation}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-semibold">{t(config.key)}</div>
            <div className="text-xs text-muted-foreground">
              {t('reputationPoints', { count: reputation })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Progress bar showing reputation towards next level
type ReputationProgressProps = {
  reputation: number;
  level: string;
};

export function ReputationProgress({ reputation, level }: ReputationProgressProps) {
  const t = useTranslations('reputation');
  const currentConfig = LEVEL_CONFIG[level as ReputationLevel] || LEVEL_CONFIG.newbie;
  const levels = Object.entries(LEVEL_CONFIG);
  const currentIndex = levels.findIndex(([key]) => key === level);
  const nextLevel = levels[currentIndex + 1];
  
  if (!nextLevel) {
    // Max level reached
    return (
      <div className="text-sm text-muted-foreground text-center">
        🎉 {t('maxLevel')}
      </div>
    );
  }

  const [_nextKey, nextConfig] = nextLevel;
  const progress = ((reputation - currentConfig.minRep) / (nextConfig.minRep - currentConfig.minRep)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={currentConfig.color}>
          {currentConfig.icon} {t(currentConfig.key)}
        </span>
        <span className={nextConfig.color}>
          {nextConfig.icon} {t(nextConfig.key)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))] transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="text-xs text-center text-muted-foreground">
        {t('pointsProgress', { current: reputation, next: nextConfig.minRep })}
      </div>
    </div>
  );
}
