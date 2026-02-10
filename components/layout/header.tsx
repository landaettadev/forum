'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, User, LogOut, Settings, MessageSquare, Shield, Bookmark, Megaphone, Bell } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const t = useTranslations();

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <header className="forum-surface border-b border-[hsl(var(--forum-border))] sticky top-0 z-50 backdrop-blur-lg bg-[hsl(var(--forum-surface))]/95 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--forum-accent))] to-[hsl(var(--forum-accent-hover))] bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                TransForo
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium hover:text-[hsl(var(--forum-accent))] transition-all hover:scale-105">
                {t('common.home')}
              </Link>
              <Link href="/anuncios" className="text-sm font-medium hover:text-[hsl(var(--forum-accent))] transition-all hover:scale-105 flex items-center gap-1">
                <Megaphone className="w-4 h-4" />
                {t('nav.ads')}
              </Link>
              <Link href="/buscar" className="text-sm font-medium hover:text-[hsl(var(--forum-accent))] transition-all hover:scale-105">
                {t('common.search')}
              </Link>
              <Link href="/reglas" className="text-sm font-medium hover:text-[hsl(var(--forum-accent))] transition-all hover:scale-105">
                {t('nav.rules')}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />

            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 forum-text-muted" />
              <Input
                type="search"
                placeholder={t('search.placeholder')}
                className="pl-9 w-64 bg-[hsl(var(--forum-surface-alt))] border-[hsl(var(--forum-border))]"
              />
            </div>

            {user && profile ? (
              <>
                <NotificationsDropdown userId={user.id} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-[hsl(var(--forum-accent))] text-white">
                          {getUserInitials(profile.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden md:flex flex-col items-start text-sm">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{profile.username}</span>
                          {profile.is_verified && (
                            <span className="text-[hsl(var(--forum-verified))]" title="Verificada">⭐</span>
                          )}
                          {profile.is_vip && (
                            <span className="text-[hsl(var(--forum-vip))]" title="VIP">💎</span>
                          )}
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href={`/usuaria/${profile.username}`} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        {t('profile.editProfile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/mensajes" className="cursor-pointer">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {t('common.messages')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/favoritos" className="cursor-pointer">
                        <Bookmark className="mr-2 h-4 w-4" />
                        {t('common.favorites')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/alertas" className="cursor-pointer">
                        <Bell className="mr-2 h-4 w-4" />
                        {t('common.alerts')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/mi-cuenta" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        {t('common.settings')}
                      </Link>
                    </DropdownMenuItem>
                    {(profile.role === 'admin' || profile.role === 'mod') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer text-[hsl(var(--forum-mod))]">
                            <Shield className="mr-2 h-4 w-4" />
                            {t('common.admin')}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('common.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">{t('common.login')}</Link>
                </Button>
                <Button asChild className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white">
                  <Link href="/registro">{t('common.register')}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
