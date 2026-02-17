'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Search, User, LogOut, Settings, MessageSquare, Shield, Bookmark, Megaphone, Bell, Flame, ShoppingBag, Menu, Home, BookOpen } from 'lucide-react';
import Image from 'next/image';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown';
import { MessagesButton } from '@/components/messages/messages-button';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const t = useTranslations();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
      router.push(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'hsl(var(--forum-surface) / 0.85)' }}>
      {/* Animated bottom border line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden">
        <div className="absolute inset-0 bg-[hsl(var(--forum-border))]" style={{ opacity: 0.5 }} />
        <div 
          className="absolute top-0 h-full w-[15%]"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--forum-accent) / 0.6), hsl(var(--forum-sweep-flash) / 0.4), hsl(var(--forum-accent) / 0.6), transparent)',
            animation: 'line-light-sweep 8s ease-in-out infinite',
          }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="TS Rating"
                className="h-16 sm:h-20 lg:h-24 w-auto scale-[1.15] sm:scale-[1.3] group-hover:scale-[1.2] transition-transform origin-left"
                onError={(e) => {
                  // Fallback to text if logo doesn't exist
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xl font-extrabold forum-gradient-text tracking-tight">
                TS Rating
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/" className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] transition-all">
                <span className="forum-hover-sweep">{t('common.home')}</span>
              </Link>
              <Link href="/publicidad" className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] transition-all flex items-center gap-1.5 group">
                <Megaphone className="w-3.5 h-3.5 group-hover:text-[hsl(var(--forum-link-hover))] transition-colors" />
                <span className="forum-hover-sweep">{t('nav.ads')}</span>
              </Link>
              <Link href="/feed" className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] transition-all flex items-center gap-1.5 group">
                <Flame className="w-3.5 h-3.5 group-hover:text-[hsl(var(--forum-link-hover))] transition-colors" />
                <span className="forum-hover-sweep">Feed</span>
              </Link>
              <Link href="/buscar" className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] transition-all">
                <span className="forum-hover-sweep">{t('common.search')}</span>
              </Link>
              <Link href="/reglas" className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] transition-all">
                <span className="forum-hover-sweep">{t('nav.rules')}</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-[hsl(var(--forum-border))]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logo.png"
                      alt="TS Rating"
                      className="h-16 w-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <span className="hidden text-lg font-extrabold forum-gradient-text">TS Rating</span>
                  </div>
                  <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                    <SheetClose asChild>
                      <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                        <Home className="w-4 h-4" />
                        {t('common.home')}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/publicidad" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                        <Megaphone className="w-4 h-4" />
                        {t('nav.ads')}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/feed" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                        <Flame className="w-4 h-4" />
                        Feed
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/buscar" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                        <Search className="w-4 h-4" />
                        {t('common.search')}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/reglas" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                        <BookOpen className="w-4 h-4" />
                        {t('nav.rules')}
                      </Link>
                    </SheetClose>

                    {user && profile && (
                      <>
                        <div className="my-2 border-t border-[hsl(var(--forum-border))]" />
                        <SheetClose asChild>
                          <Link href={`/user/${profile.username}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                            <User className="w-4 h-4" />
                            {t('profile.editProfile')}
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/mensajes" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                            <MessageSquare className="w-4 h-4" />
                            {t('common.messages')}
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/favoritos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                            <Bookmark className="w-4 h-4" />
                            {t('common.favorites')}
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/mis-anuncios" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                            <Megaphone className="w-4 h-4" />
                            {t('common.myAds')}
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/mi-cuenta" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium">
                            <Settings className="w-4 h-4" />
                            {t('common.settings')}
                          </Link>
                        </SheetClose>
                        {(profile.role === 'admin' || profile.role === 'mod') && (
                          <SheetClose asChild>
                            <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--forum-accent-muted))] text-sm font-medium text-[hsl(var(--forum-mod))]">
                              <Shield className="w-4 h-4" />
                              {t('common.admin')}
                            </Link>
                          </SheetClose>
                        )}
                      </>
                    )}
                  </nav>

                  {!user && (
                    <div className="p-4 border-t border-[hsl(var(--forum-border))] space-y-2">
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full">
                          <Link href="/login">{t('common.login')}</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild className="w-full forum-btn-gradient">
                          <Link href="/registro">{t('common.register')}</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <ThemeToggle />
            <LanguageSwitcher />

            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 forum-text-muted" />
              <Input
                type="search"
                placeholder={t('search.placeholder')}
                className="pl-9 w-56 h-9 rounded-lg bg-[hsl(var(--forum-surface-alt))] border-[hsl(var(--forum-border))]/50 focus:border-[hsl(var(--forum-accent))]/50 focus:ring-[hsl(var(--forum-accent))]/20 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>

            {user && profile ? (
              <>
                <NotificationsDropdown userId={user.id} />
                <MessagesButton />

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
                      <Link href={`/user/${profile.username}`} className="cursor-pointer">
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
                      <Link href="/tienda" className="cursor-pointer">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        {t('common.store')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/mis-anuncios" className="cursor-pointer">
                        <Megaphone className="mr-2 h-4 w-4" />
                        {t('common.myAds')}
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
                <Button variant="ghost" asChild className="rounded-lg text-sm">
                  <Link href="/login">{t('common.login')}</Link>
                </Button>
                <Button asChild className="forum-btn-gradient text-sm h-9 rounded-lg">
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
