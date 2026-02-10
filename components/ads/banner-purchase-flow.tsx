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
  DURATION_OPTIONS,
  getPrice,
  getPriceTable,
  getMinStartDate,
  calculateEndDate,
  getFormatForPosition,
} from '@/lib/banner-pricing';
import { validateBanner } from '@/lib/banner-validation';
import type { BannerPosition, BannerFormat, BannerAdZone } from '@/lib/supabase';
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

type CountryOption = { id: string; name: string; slug: string; flag_emoji: string };

interface BannerPurchaseFlowProps {
  countries: CountryOption[];
}

type Step = 1 | 2 | 3 | 4 | 5;

export function BannerPurchaseFlow({ countries }: BannerPurchaseFlowProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Zone selection
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [zones, setZones] = useState<BannerAdZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedZone, setSelectedZone] = useState<BannerAdZone | null>(null);
  const [loadingZones, setLoadingZones] = useState(false);

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

  // Auth check
  useEffect(() => {
    if (!user) {
      toast.error('Debes iniciar sesión para comprar publicidad.');
      router.push('/login');
    }
  }, [user, router]);

  // Load zones when country changes
  useEffect(() => {
    if (!selectedCountryId) {
      setZones([]);
      setSelectedZoneId('');
      setSelectedZone(null);
      return;
    }
    loadZones(selectedCountryId);
  }, [selectedCountryId]);

  const loadZones = async (countryId: string) => {
    setLoadingZones(true);
    const { data } = await supabase
      .from('banner_ad_zones')
      .select('*, country:countries(id, name, slug, flag_emoji), region:regions(id, name, slug)')
      .eq('country_id', countryId)
      .eq('is_active', true)
      .order('zone_type')
      .order('name');
    setZones((data as any) || []);
    setLoadingZones(false);
  };

  // Load occupied dates when zone+position change
  useEffect(() => {
    if (selectedZoneId && selectedPosition) {
      loadOccupiedDates();
    }
  }, [selectedZoneId, selectedPosition]);

  const loadOccupiedDates = async () => {
    setLoadingCalendar(true);
    const { data } = await supabase.rpc('get_occupied_dates', {
      p_zone_id: selectedZoneId,
      p_position: selectedPosition,
    });
    if (data) {
      setOccupiedRanges(data.map((r: any) => ({
        start: r.start_date,
        end: r.end_date,
        username: r.username,
        status: r.status,
      })));
    }
    setLoadingCalendar(false);
  };

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const z = zones.find(z => z.id === zoneId) || null;
    setSelectedZone(z);
  };

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
        toast.error('Error al subir la imagen.');
        return null;
      }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
      setUploadedUrl(urlData.publicUrl);
      return urlData.publicUrl;
    } catch {
      toast.error('Error inesperado al subir la imagen.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedZoneId || !selectedPosition || !selectedFormat || !selectedDuration || !startDate || !bannerFile) {
      toast.error('Completa todos los campos.');
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
        zoneId: selectedZoneId,
        position: selectedPosition,
        format: selectedFormat,
        startDate,
        durationDays: selectedDuration,
        imageUrl,
        clickUrl: clickUrl || undefined,
      });

      if (result.success) {
        toast.success('¡Solicitud enviada! Un moderador revisará tu banner pronto.');
        router.push('/');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Error inesperado.');
    } finally {
      setSubmitting(false);
    }
  };

  // Computed
  const minStartDateStr = getMinStartDate().toISOString().split('T')[0];
  const priceTable = selectedZone ? getPriceTable(selectedZone.zone_type as 'home_country' | 'city') : [];
  const currentPrice = selectedZone && selectedDuration
    ? getPrice(selectedZone.zone_type as 'home_country' | 'city', selectedDuration)
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

  const canGoNext = (): boolean => {
    switch (step) {
      case 1: return !!selectedZoneId;
      case 2: return !!selectedFormat && !!selectedPosition;
      case 3: return !!selectedDuration && !!startDate;
      case 4: return !!bannerFile;
      default: return false;
    }
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Comprar Publicidad</h1>
      <p className="forum-text-secondary mb-6">
        Elige dónde quieres que aparezca tu banner en TransForo.
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
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Selecciona la Zona</CardTitle>
            <CardDescription>Elige en qué país o ciudad quieres que aparezca tu banner.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>País</Label>
              <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                <SelectTrigger><SelectValue placeholder="Selecciona un país" /></SelectTrigger>
                <SelectContent>
                  {countries.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.flag_emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingZones && <div className="flex items-center gap-2 forum-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Cargando zonas...</div>}

            {zones.length > 0 && (
              <div>
                <Label>Zona publicitaria</Label>
                <div className="grid gap-2 mt-2">
                  {zones.map(z => (
                    <button
                      key={z.id}
                      onClick={() => handleZoneSelect(z.id)}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-all',
                        selectedZoneId === z.id
                          ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5'
                          : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{z.name}</div>
                          <div className="text-xs forum-text-muted mt-0.5">
                            {z.zone_type === 'home_country'
                              ? '📢 Aparece en Home + página del país'
                              : '🏙️ Aparece solo en esta ciudad/región'}
                          </div>
                        </div>
                        <Badge variant={z.zone_type === 'home_country' ? 'default' : 'secondary'}>
                          {z.zone_type === 'home_country' ? 'Home + País' : 'Ciudad'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Format & Position */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" /> Formato y Posición</CardTitle>
            <CardDescription>Elige el tamaño del banner y dónde quieres que se muestre.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">Formato del banner</Label>
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
                <Label className="mb-3 block">Posición en la página</Label>
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
                <Label className="mb-2 block text-xs">Ubicación en el sitio:</Label>
                <div className="border border-[hsl(var(--forum-border))] rounded-lg overflow-hidden bg-background text-[10px]">
                  <div className={cn('p-2 text-center border-b border-[hsl(var(--forum-border))]', selectedPosition === 'header' ? 'bg-[hsl(var(--forum-accent))]/20 font-bold text-[hsl(var(--forum-accent))]' : 'forum-text-muted')}>
                    HEADER (728×90) {selectedPosition === 'header' && '← TU BANNER'}
                  </div>
                  <div className="flex">
                    <div className={cn('flex-1 p-4 min-h-[80px] border-r border-[hsl(var(--forum-border))]', selectedPosition === 'content' ? 'bg-[hsl(var(--forum-accent))]/20 font-bold text-[hsl(var(--forum-accent))]' : 'forum-text-muted')}>
                      CONTENIDO {selectedPosition === 'content' && '← TU BANNER'}
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
                    FOOTER (728×90) {selectedPosition === 'footer' && '← TU BANNER'}
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
            <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" /> Fechas y Duración</CardTitle>
            <CardDescription>Selecciona cuándo quieres iniciar y la duración del anuncio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Occupied dates warning */}
            {loadingCalendar ? (
              <div className="flex items-center gap-2 forum-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Cargando disponibilidad...</div>
            ) : occupiedRanges.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 mb-2">
                  <Info className="h-4 w-4" /> Fechas ya reservadas:
                </div>
                <div className="space-y-1">
                  {occupiedRanges.map((r, i) => (
                    <div key={i} className="text-xs forum-text-muted">
                      <span className="font-medium">@{r.username}</span> — {r.start} al {r.end}
                      <Badge variant="outline" className="ml-2 text-[10px]">{r.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="startDate">Fecha de inicio (mínimo 3 días desde hoy)</Label>
              <Input
                id="startDate"
                type="date"
                min={minStartDateStr}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 max-w-xs"
              />
              {startDate && isDateOccupied(startDate) && (
                <p className="text-red-500 text-xs mt-1">⚠️ Esta fecha ya está reservada.</p>
              )}
            </div>

            <div>
              <Label className="mb-3 block">Duración y Precio</Label>
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
                    <div className="text-xs forum-text-muted">días</div>
                    <div className="mt-1 text-[hsl(var(--forum-accent))] font-bold">${price}</div>
                  </button>
                ))}
              </div>
            </div>

            {startDate && selectedDuration && (
              <div className="p-3 bg-[hsl(var(--forum-surface-alt))] rounded-lg text-sm">
                <strong>Resumen:</strong> {startDate} → {endDateStr} ({selectedDuration} días) — <span className="text-[hsl(var(--forum-accent))] font-bold">${currentPrice} USD</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Upload Banner */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Sube tu Banner</CardTitle>
            <CardDescription>
              La imagen debe ser exactamente <strong>{selectedFormat}</strong> píxeles. Formatos: JPG, PNG, GIF, WebP (máx. 2MB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!bannerFile ? (
              <label
                htmlFor="bannerUpload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--forum-border))] rounded-lg p-8 cursor-pointer hover:border-[hsl(var(--forum-accent))]/50 transition-colors"
              >
                <Upload className="h-10 w-10 forum-text-muted mb-3" />
                <span className="text-sm font-medium">Haz clic para subir tu banner</span>
                <span className="text-xs forum-text-muted mt-1">Dimensiones requeridas: {selectedFormat}</span>
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
              <Label htmlFor="clickUrl">URL de destino (opcional)</Label>
              <Input
                id="clickUrl"
                type="url"
                placeholder="https://ejemplo.com"
                value={clickUrl}
                onChange={(e) => setClickUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs forum-text-muted mt-1">A dónde irán los usuarios al hacer clic en tu banner.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: Confirm */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Confirmar Solicitud</CardTitle>
            <CardDescription>Revisa los detalles antes de enviar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="forum-text-muted">Zona:</span>
                <div className="font-medium">{selectedZone?.name}</div>
              </div>
              <div>
                <span className="forum-text-muted">Tipo:</span>
                <div className="font-medium">{selectedZone?.zone_type === 'home_country' ? 'Home + País' : 'Ciudad'}</div>
              </div>
              <div>
                <span className="forum-text-muted">Formato:</span>
                <div className="font-medium">{selectedFormat}</div>
              </div>
              <div>
                <span className="forum-text-muted">Posición:</span>
                <div className="font-medium">{selectedPosition && POSITION_LABELS[selectedPosition]}</div>
              </div>
              <div>
                <span className="forum-text-muted">Fechas:</span>
                <div className="font-medium">{startDate} → {endDateStr}</div>
              </div>
              <div>
                <span className="forum-text-muted">Duración:</span>
                <div className="font-medium">{selectedDuration} días</div>
              </div>
              <div>
                <span className="forum-text-muted">URL de destino:</span>
                <div className="font-medium truncate">{clickUrl || '(ninguna)'}</div>
              </div>
              <div>
                <span className="forum-text-muted">Precio:</span>
                <div className="font-bold text-lg text-[hsl(var(--forum-accent))]">${currentPrice} USD</div>
              </div>
            </div>

            {bannerPreview && (
              <div>
                <Label className="mb-2 block">Vista previa del banner:</Label>
                <img src={bannerPreview} alt="Banner" className="rounded-lg border border-[hsl(var(--forum-border))]" style={{ maxWidth: '100%' }} />
              </div>
            )}

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
              <strong>Nota:</strong> Tu solicitud será revisada por un moderador. Recibirás una notificación cuando sea aprobada o rechazada. El banner se activará automáticamente en la fecha de inicio.
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
          <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
        </Button>

        {step < 5 ? (
          <Button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canGoNext()}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
          >
            Siguiente <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
          >
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : <><DollarSign className="h-4 w-4 mr-2" /> Enviar Solicitud — ${currentPrice}</>}
          </Button>
        )}
      </div>
    </div>
  );
}
