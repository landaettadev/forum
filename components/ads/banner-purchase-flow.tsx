'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { createBannerBooking } from '@/app/publicidad/actions';
import {
  BANNER_FORMATS,
  POSITION_LABELS,
  getPrice,
  getPriceTable,
  getMinStartDate,
  calculateEndDate,
} from '@/lib/banner-pricing';
import { validateBanner } from '@/lib/banner-validation';
import type { BannerPosition, BannerFormat } from '@/lib/supabase';
import type { DurationOption } from '@/lib/banner-pricing';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Calendar as CalendarIcon,
  MapPin,
  Monitor,
  DollarSign,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
  X,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type CountryOption = { id: string; name: string; slug: string; flag_emoji: string };
type RegionOption = { id: string; name: string; slug: string; country_id: string };

interface BannerPurchaseFlowProps {
  countries: CountryOption[];
  regions: RegionOption[];
}

type ZoneType = 'home_country' | 'city';
type Step = 1 | 2 | 3 | 4 | 5;

export function BannerPurchaseFlow({ countries, regions }: BannerPurchaseFlowProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations('publicidad');

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Zone selection (no DB dependency)
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedZoneType, setSelectedZoneType] = useState<ZoneType | ''>('');
  const [selectedRegionId, setSelectedRegionId] = useState('');

  // Derived: regions for the selected country
  const countryRegions = regions.filter(r => r.country_id === selectedCountryId);

  // Step 2: Format & Position
  const [selectedFormat, setSelectedFormat] = useState<BannerFormat | ''>('');
  const [selectedPosition, setSelectedPosition] = useState<BannerPosition | ''>('');

  // Step 3: Calendar & Duration
  const [selectedDuration, setSelectedDuration] = useState<DurationOption | null>(null);
  const [startDate, setStartDate] = useState('');
  const [occupiedRanges, setOccupiedRanges] = useState<{ start: string; end: string; username: string; status: string }[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Step 4: Upload
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [clickUrl, setClickUrl] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Step 5: Confirm
  const [submitting, setSubmitting] = useState(false);

  // Auth check — wait for loading to finish before redirecting
  useEffect(() => {
    if (!loading && !user) {
      toast.error(t('loginRequired'));
      router.push('/login');
    }
  }, [user, loading, router, t]);

  // Reset dependent selections when country changes
  useEffect(() => {
    setSelectedZoneType('');
    setSelectedRegionId('');
  }, [selectedCountryId]);

  useEffect(() => {
    setSelectedRegionId('');
  }, [selectedZoneType]);

  const loadOccupiedDates = useCallback(async () => {
    setLoadingCalendar(true);
    try {
      // Find zone first
      let q = supabase
        .from('banner_ad_zones')
        .select('id')
        .eq('country_id', selectedCountryId)
        .eq('zone_type', selectedZoneType)
        .eq('is_active', true);
      if (selectedZoneType === 'city' && selectedRegionId) {
        q = q.eq('region_id', selectedRegionId);
      } else {
        q = q.is('region_id', null);
      }
      const { data: zone } = await q.maybeSingle();
      if (!zone) {
        setOccupiedRanges([]);
        setLoadingCalendar(false);
        return;
      }
      const { data } = await supabase.rpc('get_occupied_dates', {
        p_zone_id: zone.id,
        p_position: selectedPosition,
      });
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOccupiedRanges(data.map((r: any) => ({
          start: r.start_date,
          end: r.end_date,
          username: r.username,
          status: r.status,
        })));
      }
    } catch {
      setOccupiedRanges([]);
    }
    setLoadingCalendar(false);
  }, [selectedCountryId, selectedRegionId, selectedZoneType, selectedPosition]);

  // Load occupied dates when position changes
  useEffect(() => {
    if (selectedCountryId && selectedPosition) {
      loadOccupiedDates();
    }
  }, [selectedCountryId, selectedRegionId, selectedPosition, loadOccupiedDates]);

  const handleFormatSelect = (format: BannerFormat) => {
    setSelectedFormat(format);
    setSelectedPosition('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFormat) return;

    const result = await validateBanner(file, selectedFormat as BannerFormat);
    if (!result.valid) {
      toast.error(result.error);
      e.target.value = '';
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setUploadedUrl('');
  };

  const removeBanner = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview('');
    setUploadedUrl('');
  };

  const uploadBannerImage = async (): Promise<string | null> => {
    if (!bannerFile || !user) return null;
    if (uploadedUrl) return uploadedUrl;

    setUploading(true);
    try {
      const ext = bannerFile.name.split('.').pop();
      const path = `banners/${user.id}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('media')
        .upload(path, bannerFile, { cacheControl: '3600', upsert: false });

      if (error) {
        toast.error(t('uploadError'));
        return null;
      }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
      setUploadedUrl(urlData.publicUrl);
      return urlData.publicUrl;
    } catch {
      toast.error(t('unexpectedError'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCountryId || !selectedZoneType || !selectedPosition || !selectedFormat || !selectedDuration || !startDate || !bannerFile) {
      toast.error(t('completeAllFields'));
      return;
    }

    setSubmitting(true);
    try {
      // Upload image first
      const imageUrl = await uploadBannerImage();
      if (!imageUrl) {
        setSubmitting(false);
        return;
      }

      const result = await createBannerBooking({
        countryId: selectedCountryId,
        zoneType: selectedZoneType,
        regionId: selectedZoneType === 'city' ? selectedRegionId : undefined,
        position: selectedPosition,
        format: selectedFormat,
        startDate,
        durationDays: selectedDuration,
        imageUrl,
        clickUrl: clickUrl || undefined,
      });

      if (result.success) {
        toast.success(t('requestSent'));
        router.push(`/publicidad/pago/${result.data.bookingId}`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setSubmitting(false);
    }
  };

  // Computed
  const minStartDateStr = getMinStartDate().toISOString().split('T')[0];
  const priceTable = selectedZoneType ? getPriceTable(selectedZoneType) : [];
  const currentPrice = selectedZoneType && selectedDuration
    ? getPrice(selectedZoneType, selectedDuration)
    : 0;
  const endDateStr = startDate && selectedDuration
    ? calculateEndDate(new Date(startDate), selectedDuration).toISOString().split('T')[0]
    : '';

  const isDateOccupied = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return occupiedRanges.some(r => {
      const s = new Date(r.start);
      const e = new Date(r.end);
      return d >= s && d <= e && (r.status === 'approved' || r.status === 'active');
    });
  }, [occupiedRanges]);

  // Next availability: latest end_date from occupied ranges
  const nextAvailable = occupiedRanges.length > 0
    ? occupiedRanges.reduce((latest, r) => {
        const end = new Date(r.end);
        return end > latest ? end : latest;
      }, new Date(0))
    : null;
  const nextAvailableStr = nextAvailable && nextAvailable.getTime() > 0
    ? new Date(nextAvailable.getTime() + 86400000).toISOString().split('T')[0]
    : null;

  const canGoNext = (): boolean => {
    switch (step) {
      case 1: return !!selectedCountryId && !!selectedZoneType && (selectedZoneType === 'home_country' || !!selectedRegionId);
      case 2: return !!selectedFormat && !!selectedPosition;
      case 3: return !!selectedDuration && !!startDate;
      case 4: return !!bannerFile;
      default: return false;
    }
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
      <p className="forum-text-secondary mb-6">
        {t('subtitle')}
      </p>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
              step >= s
                ? 'bg-[hsl(var(--forum-accent))] text-white'
                : 'bg-[hsl(var(--forum-surface-alt))] forum-text-muted'
            )}>
              {step > s ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 5 && <div className={cn('w-8 h-0.5', step > s ? 'bg-[hsl(var(--forum-accent))]' : 'bg-[hsl(var(--forum-border))]')} />}
          </div>
        ))}
      </div>

      {/* STEP 1: Zone Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {t('step1Title')}</CardTitle>
            <CardDescription>{t('step1Desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('country')}</Label>
              <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                <SelectTrigger><SelectValue placeholder={t('selectCountry')} /></SelectTrigger>
                <SelectContent>
                  {countries.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.flag_emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCountryId && (
              <div>
                <Label>{t('zoneType')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <button
                    onClick={() => setSelectedZoneType('home_country')}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-all',
                      selectedZoneType === 'home_country'
                        ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5'
                        : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50'
                    )}
                  >
                    <div className="font-semibold flex items-center gap-2">📢 {t('homeCountry')}</div>
                    <div className="text-xs forum-text-muted mt-1">
                      {t('homeCountryDesc')}
                    </div>
                    <Badge className="mt-2" variant="default">{t('highVisibility')}</Badge>
                  </button>
                  <button
                    onClick={() => setSelectedZoneType('city')}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-all',
                      selectedZoneType === 'city'
                        ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5'
                        : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50'
                    )}
                  >
                    <div className="font-semibold flex items-center gap-2">🏙️ {t('cityRegion')}</div>
                    <div className="text-xs forum-text-muted mt-1">
                      {t('cityRegionDesc')}
                    </div>
                    <Badge className="mt-2" variant="secondary">{t('moreAffordable')}</Badge>
                  </button>
                </div>
              </div>
            )}

            {selectedZoneType === 'city' && countryRegions.length > 0 && (
              <div>
                <Label>{t('cityRegion')}</Label>
                <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                  <SelectTrigger><SelectValue placeholder={t('selectCity')} /></SelectTrigger>
                  <SelectContent>
                    {countryRegions.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedZoneType === 'city' && countryRegions.length === 0 && selectedCountryId && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                <Info className="h-4 w-4 inline mr-1" /> {t('noRegions')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Format & Position */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" /> {t('step2Title')}</CardTitle>
            <CardDescription>{t('step2Desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">{t('bannerFormat')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BANNER_FORMATS.map(f => (
                  <button
                    key={f.format}
                    onClick={() => handleFormatSelect(f.format)}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-all',
                      selectedFormat === f.format
                        ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5'
                        : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50'
                    )}
                  >
                    <div className="font-semibold">{f.label}</div>
                    <div className="mt-2 border border-dashed border-[hsl(var(--forum-border))] rounded flex items-center justify-center text-xs forum-text-muted"
                      style={{ width: Math.min(f.width, 300), height: Math.min(f.height, 120), maxWidth: '100%' }}
                    >
                      {f.width}×{f.height}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedFormat && (
              <div>
                <Label className="mb-3 block">{t('pagePosition')}</Label>
                <div className="grid gap-2">
                  {BANNER_FORMATS.find(f => f.format === selectedFormat)?.positions.map(pos => (
                    <button
                      key={pos}
                      onClick={() => setSelectedPosition(pos)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        selectedPosition === pos
                          ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5'
                          : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50'
                      )}
                    >
                      <div className="font-medium text-sm">{POSITION_LABELS[pos]}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Visual site mockup */}
            {selectedPosition && (
              <div className="mt-4 p-4 bg-[hsl(var(--forum-surface-alt))] rounded-lg">
                <Label className="mb-2 block text-xs">{t('siteLocation')}</Label>
                <div className="border border-[hsl(var(--forum-border))] rounded-lg overflow-hidden bg-background text-[10px]">
                  <div className={cn('p-2 text-center border-b border-[hsl(var(--forum-border))]', selectedPosition === 'header' ? 'bg-[hsl(var(--forum-accent))]/20 font-bold text-[hsl(var(--forum-accent))]' : 'forum-text-muted')}>
                    HEADER (728×90) {selectedPosition === 'header' && `← ${t('yourBanner')}`}
                  </div>
                  <div className="flex">
                    <div className={cn('flex-1 p-4 min-h-[80px] border-r border-[hsl(var(--forum-border))]', selectedPosition === 'content' ? 'bg-[hsl(var(--forum-accent))]/20 font-bold text-[hsl(var(--forum-accent))]' : 'forum-text-muted')}>
                      {t('contentArea')} {selectedPosition === 'content' && `← ${t('yourBanner')}`}
                    </div>
                    <div className="w-24 p-2 space-y-2">
                      <div className={cn('p-1 text-center rounded', selectedPosition === 'sidebar_top' ? 'bg-[hsl(var(--forum-accent))]/20 font-bold text-[hsl(var(--forum-accent))]' : 'bg-[hsl(var(--forum-surface-alt))] forum-text-muted')}>
                        SIDEBAR TOP {selectedPosition === 'sidebar_top' && '↑'}
                      </div>
                      <div className={cn('p-1 text-center rounded', selectedPosition === 'sidebar_bottom' ? 'bg-[hsl(var(--forum-accent))]/20 font-bold text-[hsl(var(--forum-accent))]' : 'bg-[hsl(var(--forum-surface-alt))] forum-text-muted')}>
                        SIDEBAR BTM {selectedPosition === 'sidebar_bottom' && '↑'}
                      </div>
                    </div>
                  </div>
                  <div className={cn('p-2 text-center border-t border-[hsl(var(--forum-border))]', selectedPosition === 'footer' ? 'bg-[hsl(var(--forum-accent))]/20 font-bold text-[hsl(var(--forum-accent))]' : 'forum-text-muted')}>
                    FOOTER (728×90) {selectedPosition === 'footer' && `← ${t('yourBanner')}`}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Calendar & Duration */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" /> {t('step3Title')}</CardTitle>
            <CardDescription>{t('step3Desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Occupied dates warning + next availability */}
            {loadingCalendar ? (
              <div className="flex items-center gap-2 forum-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> {t('loadingAvailability')}</div>
            ) : occupiedRanges.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 mb-2">
                    <Info className="h-4 w-4" /> {t('datesReserved')}
                  </div>
                  <div className="space-y-1">
                    {occupiedRanges.map((r, i) => (
                      <div key={i} className="text-xs forum-text-muted">
                        <span className="font-medium">@{r.username}</span> — {r.start} {t('toDate')} {r.end}
                        <Badge variant="outline" className="ml-2 text-[10px]">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                {nextAvailableStr && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <CalendarIcon className="h-4 w-4" /> {t('nextAvailability')} <strong>{nextAvailableStr}</strong>
                    </div>
                    <p className="text-xs forum-text-muted mt-1">
                      {t('nextAvailabilityDesc')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs border-green-500/50 text-green-600 hover:bg-green-500/10"
                      onClick={() => setStartDate(nextAvailableStr)}
                    >
                      {t('useThisDate')}
                    </Button>
                  </div>
                )}
              </div>
            ) : selectedPosition && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm">
                <CalendarIcon className="h-4 w-4 inline mr-1 text-green-600" />
                <span className="text-green-600 font-medium">{t('available')}</span> — {t('availableDesc')}
              </div>
            )}

            <div>
              <Label htmlFor="startDate">{t('startDate', { date: minStartDateStr })}</Label>
              <Input
                id="startDate"
                type="date"
                min={minStartDateStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 max-w-xs"
              />
              {startDate && isDateOccupied(startDate) && (
                <p className="text-red-500 text-xs mt-1">⚠️ {t('dateOccupied')}</p>
              )}
            </div>

            <div>
              <Label className="mb-3 block">{t('durationPrice')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {priceTable.map(({ duration, price }) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={cn(
                      'p-3 rounded-lg border text-center transition-all',
                      selectedDuration === duration
                        ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5'
                        : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50'
                    )}
                  >
                    <div className="font-bold text-lg">{duration}</div>
                    <div className="text-xs forum-text-muted">{t('days')}</div>
                    <div className="mt-1 text-[hsl(var(--forum-accent))] font-bold">${price}</div>
                  </button>
                ))}
              </div>
            </div>

            {startDate && selectedDuration && (
              <div className="p-3 bg-[hsl(var(--forum-surface-alt))] rounded-lg text-sm">
                <strong>{t('summary')}</strong> {startDate} → {endDateStr} ({selectedDuration} {t('days')}) — <span className="text-[hsl(var(--forum-accent))] font-bold">${currentPrice} USD</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Upload Banner */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> {t('step4Title')}</CardTitle>
            <CardDescription>
              {t('step4Desc', { format: selectedFormat })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!bannerFile ? (
              <label
                htmlFor="bannerUpload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--forum-border))] rounded-lg p-8 cursor-pointer hover:border-[hsl(var(--forum-accent))]/50 transition-colors"
              >
                <Upload className="h-10 w-10 forum-text-muted mb-3" />
                <span className="text-sm font-medium">{t('clickToUpload')}</span>
                <span className="text-xs forum-text-muted mt-1">{t('requiredDimensions', { format: selectedFormat })}</span>
                <input
                  id="bannerUpload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bannerPreview}
                    alt="Preview"
                    className="rounded-lg border border-[hsl(var(--forum-border))]"
                    style={{ maxWidth: '100%' }}
                  />
                  <button
                    onClick={removeBanner}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs forum-text-muted">{bannerFile.name} — {(bannerFile.size / 1024).toFixed(1)}KB</p>
              </div>
            )}

            <div>
              <Label htmlFor="clickUrl">{t('clickUrl')}</Label>
              <Input
                id="clickUrl"
                type="url"
                placeholder={t('clickUrlPlaceholder')}
                value={clickUrl}
                onChange={(e) => setClickUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs forum-text-muted mt-1">{t('clickUrlDesc')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: Confirm */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> {t('step5Title')}</CardTitle>
            <CardDescription>{t('step5Desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="forum-text-muted">{t('country')}:</span>
                <div className="font-medium">{countries.find(c => c.id === selectedCountryId)?.flag_emoji} {countries.find(c => c.id === selectedCountryId)?.name}</div>
              </div>
              <div>
                <span className="forum-text-muted">{t('type')}:</span>
                <div className="font-medium">{selectedZoneType === 'home_country' ? t('homeCountry') : t('cityLabel', { name: regions.find(r => r.id === selectedRegionId)?.name || '' })}</div>
              </div>
              <div>
                <span className="forum-text-muted">{t('format')}:</span>
                <div className="font-medium">{selectedFormat}</div>
              </div>
              <div>
                <span className="forum-text-muted">{t('position')}:</span>
                <div className="font-medium">{selectedPosition && POSITION_LABELS[selectedPosition]}</div>
              </div>
              <div>
                <span className="forum-text-muted">{t('dates')}:</span>
                <div className="font-medium">{startDate} → {endDateStr}</div>
              </div>
              <div>
                <span className="forum-text-muted">{t('duration')}:</span>
                <div className="font-medium">{selectedDuration} {t('days')}</div>
              </div>
              <div>
                <span className="forum-text-muted">{t('destinationUrl')}:</span>
                <div className="font-medium truncate">{clickUrl || t('none')}</div>
              </div>
              <div>
                <span className="forum-text-muted">{t('price')}:</span>
                <div className="font-bold text-lg text-[hsl(var(--forum-accent))]">${currentPrice} USD</div>
              </div>
            </div>

            {bannerPreview && (
              <div>
                <Label className="mb-2 block">{t('bannerPreview')}</Label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerPreview} alt="Banner" className="rounded-lg border border-[hsl(var(--forum-border))]" style={{ maxWidth: '100%' }} />
              </div>
            )}

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
              <strong>{t('note')}</strong> {t('reviewNote')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((step - 1) as Step)}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('previous')}
        </Button>

        {step < 5 ? (
          <Button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canGoNext()}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
          >
            {t('next')} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
          >
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('submitting')}</> : <><DollarSign className="h-4 w-4 mr-2" /> {t('submitRequest')} — ${currentPrice}</>}
          </Button>
        )}
      </div>
    </div>
  );
}
