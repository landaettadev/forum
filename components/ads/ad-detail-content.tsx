'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { 
  MapPin, 
  Heart, 
  Eye, 
  Clock, 
  Star, 
  Phone, 
  MessageCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  Verified,
  Crown,
  Calendar,
  User,
  Ruler,
  Scale,
  Palette,
  Share2,
  Flag,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { EscortAd } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { cn } from '@/lib/utils';

type AdDetailContentProps = {
  ad: EscortAd;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  relatedAds: any[];
};

export function AdDetailContent({ ad, relatedAds }: AdDetailContentProps) {
  const t = useTranslations('ads');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const { user } = useAuth();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const photos = ad.photos?.sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  }) || [];

  const toggleFavorite = async () => {
    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }

    try {
      const { data, error } = await supabase.rpc('toggle_ad_favorite', {
        p_ad_id: ad.id,
        p_user_id: user.id
      });

      if (error) throw error;
      setIsFavorite(data.favorited);
      toast.success(data.favorited ? t('addedToFavorites') : t('removedFromFavorites'));
    } catch {
      toast.error(t('error'));
    }
  };

  const revealContact = async () => {
    setShowContact(true);
    // Increment contact views
    await supabase
      .from('escort_ads')
      .update({ contacts_count: (ad.contacts_count || 0) + 1 })
      .eq('id', ad.id);
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/anuncios" className="inline-flex items-center gap-2 forum-text-secondary hover:forum-text transition-colors">
        <ChevronLeft className="w-4 h-4" />
        {t('backToAds')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Gallery */}
          <Card className="forum-surface border-[hsl(var(--forum-border))] overflow-hidden">
            <div className="relative aspect-[16/10] bg-[hsl(var(--forum-surface-alt))]">
              {photos.length > 0 ? (
                <>
                  <Image
                    src={photos[currentPhotoIndex]?.url}
                    alt={ad.title}
                    fill
                    className="object-contain cursor-pointer"
                    onClick={() => setShowGallery(true)}
                  />
                  
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {photos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentPhotoIndex(idx)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-colors",
                              idx === currentPhotoIndex ? "bg-white" : "bg-white/50"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">📷</span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {ad.is_featured && (
                  <Badge className="bg-yellow-500 text-black">
                    <Star className="w-3 h-3 mr-1" />
                    {t('featured')}
                  </Badge>
                )}
                {ad.is_vip && (
                  <Badge className="bg-purple-500 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    VIP
                  </Badge>
                )}
                {ad.is_verified && (
                  <Badge className="bg-green-500 text-white">
                    <Verified className="w-3 h-3 mr-1" />
                    {t('verified')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="p-4 flex gap-2 overflow-x-auto">
                {photos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={cn(
                      "relative w-20 h-20 flex-shrink-0 rounded overflow-hidden border-2 transition-colors",
                      idx === currentPhotoIndex ? "border-[hsl(var(--forum-accent))]" : "border-transparent"
                    )}
                  >
                    <Image
                      src={photo.thumbnail_url || photo.url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Title and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold forum-text">{ad.title}</h1>
              <div className="flex items-center gap-2 mt-2 forum-text-secondary">
                <MapPin className="w-4 h-4" />
                <span>
                  {ad.country?.flag_emoji} {[ad.city, ad.region?.name, ad.country?.name].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={toggleFavorite}>
                <Heart className={cn("w-5 h-5", isFavorite && "fill-red-500 text-red-500")} />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon">
                <Flag className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">{t('description')}</TabsTrigger>
              <TabsTrigger value="services">{t('services')}</TabsTrigger>
              <TabsTrigger value="availability">{t('availability')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="mt-4">
              <Card className="forum-surface border-[hsl(var(--forum-border))]">
                <CardContent className="p-6">
                  <p className="forum-text whitespace-pre-wrap">{ad.description}</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="services" className="mt-4">
              <Card className="forum-surface border-[hsl(var(--forum-border))]">
                <CardContent className="p-6">
                  {ad.services && ad.services.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {ad.services.map((service, idx) => (
                        <Badge key={idx} variant="secondary">
                          {t(`services.${service}`, { defaultValue: service })}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="forum-text-muted">{t('noServicesListed')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="availability" className="mt-4">
              <Card className="forum-surface border-[hsl(var(--forum-border))]">
                <CardContent className="p-6">
                  {ad.availability && Object.keys(ad.availability).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(ad.availability).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="font-medium capitalize">{t(`days.${day}`)}</span>
                          <span className="forum-text-secondary">{(hours as string[]).join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="forum-text-muted">{t('contactForAvailability')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Card */}
          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardHeader>
              <CardTitle className="text-lg">{t('contact')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price */}
              {ad.rates && Object.keys(ad.rates).length > 0 && (
                <div className="p-4 rounded-lg bg-[hsl(var(--forum-surface-alt))]">
                  <p className="text-sm forum-text-secondary mb-2">{t('rates')}</p>
                  <div className="space-y-1">
                    {Object.entries(ad.rates).map(([duration, price]) => (
                      <div key={duration} className="flex justify-between">
                        <span>{t(`duration.${duration}`, { defaultValue: duration })}</span>
                        <span className="font-semibold text-[hsl(var(--forum-accent))]">
                          {ad.currency} {price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact buttons */}
              {!showContact ? (
                <Button className="w-full" onClick={revealContact}>
                  {t('showContact')}
                </Button>
              ) : (
                <div className="space-y-3">
                  {ad.phone && (
                    <a href={`tel:${ad.phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--forum-surface-alt))] hover:bg-[hsl(var(--forum-border))] transition-colors">
                      <Phone className="w-5 h-5 text-[hsl(var(--forum-accent))]" />
                      <span>{ad.phone}</span>
                    </a>
                  )}
                  {ad.whatsapp && (
                    <a href={`https://wa.me/${ad.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  {ad.telegram && (
                    <a href={`https://t.me/${ad.telegram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                      <MessageCircle className="w-5 h-5 text-blue-500" />
                      <span>Telegram</span>
                    </a>
                  )}
                  {ad.email && (
                    <a href={`mailto:${ad.email}`} className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--forum-surface-alt))] hover:bg-[hsl(var(--forum-border))] transition-colors">
                      <Mail className="w-5 h-5 text-[hsl(var(--forum-accent))]" />
                      <span>{ad.email}</span>
                    </a>
                  )}
                </div>
              )}

              {/* Availability badges */}
              <div className="flex gap-2">
                {ad.incall && (
                  <Badge variant="outline" className="flex-1 justify-center">
                    {t('incall')}
                  </Badge>
                )}
                {ad.outcall && (
                  <Badge variant="outline" className="flex-1 justify-center">
                    {t('outcall')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardHeader>
              <CardTitle className="text-lg">{t('details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ad.age && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 forum-text-muted" />
                  <span>{ad.age} {t('years')}</span>
                </div>
              )}
              {ad.height && (
                <div className="flex items-center gap-3">
                  <Ruler className="w-4 h-4 forum-text-muted" />
                  <span>{ad.height} cm</span>
                </div>
              )}
              {ad.weight && (
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4 forum-text-muted" />
                  <span>{ad.weight} kg</span>
                </div>
              )}
              {ad.ethnicity && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 forum-text-muted" />
                  <span>{t(`ethnicity.${ad.ethnicity}`, { defaultValue: ad.ethnicity })}</span>
                </div>
              )}
              {ad.hair_color && (
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 forum-text-muted" />
                  <span>{t(`hair.${ad.hair_color}`, { defaultValue: ad.hair_color })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardContent className="p-4">
              <div className="flex justify-around text-center">
                <div>
                  <Eye className="w-5 h-5 mx-auto forum-text-muted" />
                  <p className="font-semibold mt-1">{ad.views_count}</p>
                  <p className="text-xs forum-text-muted">{t('views')}</p>
                </div>
                <div>
                  <Heart className="w-5 h-5 mx-auto forum-text-muted" />
                  <p className="font-semibold mt-1">{ad.favorites_count}</p>
                  <p className="text-xs forum-text-muted">{t('favorites')}</p>
                </div>
                <div>
                  <Clock className="w-5 h-5 mx-auto forum-text-muted" />
                  <p className="font-semibold mt-1">
                    {formatDistanceToNow(new Date(ad.created_at), { locale: dateLocale })}
                  </p>
                  <p className="text-xs forum-text-muted">{t('published')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Author Card */}
          {ad.author && (
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardContent className="p-4">
                <Link href={`/usuaria/${ad.author.username}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={ad.author.avatar_url || ''} />
                    <AvatarFallback>{ad.author.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium forum-text">{ad.author.username}</p>
                    <p className="text-xs forum-text-muted">
                      {t('memberSince')} {new Date(ad.author.created_at).getFullYear()}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Related Ads */}
      {relatedAds.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold forum-text mb-4">{t('relatedAds')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedAds.map((relAd) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const photo = relAd.photos?.find((p: any) => p.is_primary) || relAd.photos?.[0];
              return (
                <Link key={relAd.id} href={`/anuncios/${relAd.id}`}>
                  <Card className="forum-surface border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))] transition-colors overflow-hidden">
                    <div className="relative aspect-square bg-[hsl(var(--forum-surface-alt))]">
                      {photo ? (
                        <Image src={photo.thumbnail_url || photo.url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium truncate text-sm">{relAd.title}</p>
                      {relAd.rates && Object.keys(relAd.rates).length > 0 && (
                        <p className="text-sm text-[hsl(var(--forum-accent))]">
                          {relAd.currency} {Math.min(...Object.values(relAd.rates) as number[])}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <button className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full">
            <X className="w-8 h-8" />
          </button>
          <div className="relative w-full h-full max-w-5xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={photos[currentPhotoIndex]?.url}
              alt={ad.title}
              fill
              className="object-contain"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
