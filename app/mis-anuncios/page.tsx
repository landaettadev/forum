'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, ExternalLink, Calendar, MapPin, Monitor, Image as ImageIcon, Clock, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { BannerBooking } from '@/lib/supabase';

type BookingWithZone = BannerBooking & {
  zone?: {
    id: string;
    name: string;
    zone_type: string;
    country?: { name: string; flag_emoji: string };
    region?: { name: string };
  };
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function MisAnunciosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('myAds');

  const [bookings, setBookings] = useState<BookingWithZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banner_bookings')
        .select(`
          *,
          zone:banner_ad_zones(
            id, name, zone_type,
            country:countries(name, flag_emoji),
            region:regions(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        setBookings([]);
      } else {
        // Filter out expired bookings (end_date < today)
        const now = new Date().toISOString().split('T')[0];
        const visible = (data || []).filter((b: BookingWithZone) => {
          if (b.status === 'expired' || b.status === 'cancelled') {
            // Hide expired/cancelled that ended more than 7 days ago
            const endDate = new Date(b.end_date);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return endDate >= sevenDaysAgo;
          }
          return true;
        });
        setBookings(visible);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchBookings();
  }, [user, authLoading, router, fetchBookings]);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t('pending'),
      approved: t('approved'),
      active: t('active'),
      rejected: t('rejected'),
      expired: t('expired'),
      cancelled: t('cancelled'),
    };
    return map[status] || status;
  };

  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <Breadcrumbs items={[{ label: t('title') }]} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Megaphone className="w-7 h-7 text-[hsl(var(--forum-accent))]" />
              {t('title')}
            </h1>
            <p className="text-sm forum-text-secondary mt-1">{t('subtitle')}</p>
          </div>
          <Button asChild className="forum-btn-gradient">
            <Link href="/publicidad">
              {t('buyNow')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-lg bg-[hsl(var(--forum-muted))] animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="w-12 h-12 text-[hsl(var(--forum-muted-foreground))] mb-4" />
              <p className="text-lg font-medium forum-text mb-2">{t('noAds')}</p>
              <Button asChild className="mt-4 forum-btn-gradient">
                <Link href="/publicidad">
                  {t('buyNow')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const daysLeft = getDaysLeft(booking.end_date);
              const isActive = booking.status === 'active';
              const zoneName = booking.zone?.name || '—';
              const countryFlag = booking.zone?.country?.flag_emoji || '';
              const countryName = booking.zone?.country?.name || '';

              return (
                <Card key={booking.id} className={`overflow-hidden ${isActive ? 'border-green-500/30' : ''}`}>
                  <div className="flex flex-col sm:flex-row">
                    {/* Banner preview */}
                    <div className="sm:w-48 h-32 sm:h-auto bg-[hsl(var(--forum-muted))] flex items-center justify-center flex-shrink-0 border-b sm:border-b-0 sm:border-r border-[hsl(var(--forum-border))]">
                      {booking.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={booking.image_url}
                          alt="Banner"
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[hsl(var(--forum-muted-foreground))]">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs">{t('noPreview')}</span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${STATUS_COLORS[booking.status] || ''} border`}>
                            {getStatusLabel(booking.status)}
                          </Badge>
                          {isActive && daysLeft > 0 && (
                            <span className="text-xs forum-text-secondary flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {t('daysLeft', { days: daysLeft })}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-[hsl(var(--forum-accent))]">
                          ${Number(booking.price_usd).toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-xs forum-text-muted block">{t('zone')}</span>
                          <span className="font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {countryFlag} {countryName || zoneName}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs forum-text-muted block">{t('position')}</span>
                          <span className="font-medium flex items-center gap-1">
                            <Monitor className="w-3 h-3 flex-shrink-0" />
                            {booking.position}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs forum-text-muted block">{t('format')}</span>
                          <span className="font-medium">{booking.format}</span>
                        </div>
                        <div>
                          <span className="text-xs forum-text-muted block">{t('period')}</span>
                          <span className="font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            {booking.duration_days}d
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs forum-text-muted">
                        <span>{t('startDate')}: {new Date(booking.start_date).toLocaleDateString()}</span>
                        <span>{t('endDate')}: {new Date(booking.end_date).toLocaleDateString()}</span>
                        {booking.click_url && (
                          <a
                            href={booking.click_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[hsl(var(--forum-accent))] hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            URL
                          </a>
                        )}
                      </div>

                      {booking.admin_notes && booking.status === 'rejected' && (
                        <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                          {booking.admin_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
