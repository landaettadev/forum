'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type Moderator = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  moderator_type: string | null;
};

export function ModeratorsModal() {
  const t = useTranslations('sidebar');
  const [mods, setMods] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    const fetchMods = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, role, moderator_type')
          .in('role', ['admin', 'mod'])
          .order('role', { ascending: true })
          .limit(20);

        if (error) throw error;
        setMods(data || []);
      } catch (error) {
        console.error('Error fetching moderators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMods();
  }, [open]);

  const admins = mods.filter(m => m.role === 'admin');
  const moderators = mods.filter(m => m.role === 'mod');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="forum-text-muted hover:text-[hsl(var(--forum-accent))] transition-colors flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          {t('moderators')}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
            {t('moderators')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse p-2">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--forum-surface-alt))]" />
                  <div className="flex-1 h-4 bg-[hsl(var(--forum-surface-alt))] rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {admins.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-[hsl(var(--forum-admin))]">
                    {t('administrators')}
                  </h4>
                  <div className="space-y-1">
                    {admins.map((mod) => (
                      <Link
                        key={mod.id}
                        href={`/user/${mod.username}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 hover:bg-[hsl(var(--forum-surface-hover))] p-2 rounded-lg transition-colors group"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={mod.avatar_url || undefined} />
                          <AvatarFallback className="text-sm font-semibold bg-[hsl(var(--forum-admin))]/20 text-[hsl(var(--forum-admin))]">
                            {mod.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-[hsl(var(--forum-accent))] transition-colors">
                            {mod.username}
                          </p>
                          <p className="text-xs text-[hsl(var(--forum-admin))]">
                            {t('superAdministrator')}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {moderators.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-[hsl(var(--forum-accent))]">
                    {t('moderators')}
                  </h4>
                  <div className="space-y-1">
                    {moderators.map((mod) => (
                      <Link
                        key={mod.id}
                        href={`/user/${mod.username}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 hover:bg-[hsl(var(--forum-surface-hover))] p-2 rounded-lg transition-colors group"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={mod.avatar_url || undefined} />
                          <AvatarFallback className="text-sm font-semibold bg-[hsl(var(--forum-accent))]/20 text-[hsl(var(--forum-accent))]">
                            {mod.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-[hsl(var(--forum-accent))] transition-colors">
                            {mod.username}
                          </p>
                          <p className="text-xs forum-text-muted">
                            {mod.moderator_type || t('generalModerator')}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {admins.length === 0 && moderators.length === 0 && (
                <p className="text-sm forum-text-muted text-center py-4">
                  {t('noModerators')}
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
