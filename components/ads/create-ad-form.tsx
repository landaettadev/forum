'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  X, 
  Plus,
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  DollarSign,
  Calendar,
  User,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { CountryOption } from '@/lib/supabase';

type CreateAdFormProps = {
  countries: CountryOption[];
  services: { id: string; name_key: string; category: string }[];
};

export function CreateAdForm({ countries, services }: CreateAdFormProps) {
  const t = useTranslations('ads');
  const router = useRouter();
  const { user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regions, setRegions] = useState<{ id: string; name: string; slug: string }[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    country_id: '',
    region_id: '',
    city: '',
    neighborhood: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    email: '',
    website: '',
    age: '',
    height: '',
    weight: '',
    ethnicity: '',
    hair_color: '',
    eye_color: '',
    body_type: '',
    services: [] as string[],
    rates: {} as Record<string, string>,
    currency: 'USD',
    incall: false,
    outcall: false,
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);

  // Load regions when country changes
  useEffect(() => {
    if (formData.country_id) {
      loadRegions(formData.country_id);
    } else {
      setRegions([]);
    }
  }, [formData.country_id]);

  const loadRegions = async (countryId: string) => {
    const { data } = await supabase
      .from('regions')
      .select('id, name, slug')
      .eq('country_id', countryId)
      .order('name');
    setRegions(data || []);
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast.error(t('loginRequired'));
      router.push('/login');
    }
  }, [user, router, t]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (serviceKey: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceKey)
        ? prev.services.filter(s => s !== serviceKey)
        : [...prev.services, serviceKey]
    }));
  };

  const handleRateChange = (duration: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      rates: { ...prev.rates, [duration]: value }
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 10) {
      toast.error(t('maxPhotos'));
      return;
    }
    
    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);
    
    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotosPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotosPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }

    if (!formData.title || !formData.description || !formData.country_id) {
      toast.error(t('requiredFields'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up rates (remove empty values and convert to numbers)
      const cleanRates: Record<string, number> = {};
      Object.entries(formData.rates).forEach(([key, value]) => {
        if (value && !isNaN(Number(value))) {
          cleanRates[key] = Number(value);
        }
      });

      // Create ad
      const { data: ad, error: adError } = await supabase
        .from('escort_ads')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          country_id: formData.country_id || null,
          region_id: formData.region_id || null,
          city: formData.city || null,
          neighborhood: formData.neighborhood || null,
          phone: formData.phone || null,
          whatsapp: formData.whatsapp || null,
          telegram: formData.telegram || null,
          email: formData.email || null,
          website: formData.website || null,
          age: formData.age ? parseInt(formData.age) : null,
          height: formData.height ? parseInt(formData.height) : null,
          weight: formData.weight ? parseInt(formData.weight) : null,
          ethnicity: formData.ethnicity || null,
          hair_color: formData.hair_color || null,
          eye_color: formData.eye_color || null,
          body_type: formData.body_type || null,
          services: formData.services,
          rates: cleanRates,
          currency: formData.currency,
          incall: formData.incall,
          outcall: formData.outcall,
          status: 'pending',
        })
        .select()
        .single();

      if (adError) throw adError;

      // Upload photos
      if (photos.length > 0 && ad) {
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${ad.id}/${Date.now()}_${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('ad-photos')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Photo upload error:', uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('ad-photos')
            .getPublicUrl(fileName);

          await supabase
            .from('escort_ad_photos')
            .insert({
              ad_id: ad.id,
              url: publicUrl,
              is_primary: i === 0,
              display_order: i,
            });
        }
      }

      toast.success(t('adCreated'));
      router.push(`/anuncios/${ad.id}`);
    } catch (error) {
      console.error('Error creating ad:', error);
      toast.error(t('errorCreating'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currencies = ['USD', 'EUR', 'GBP', 'MXN', 'COP', 'ARS', 'BRL', 'CLP', 'PEN'];
  const durations = ['30min', '1hour', '2hours', '3hours', 'overnight', 'weekend'];
  const ethnicities = ['latina', 'caucasian', 'asian', 'african', 'middle_eastern', 'mixed'];
  const hairColors = ['black', 'brown', 'blonde', 'red', 'gray', 'other'];
  const bodyTypes = ['slim', 'athletic', 'average', 'curvy', 'plus_size'];

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold forum-text">{t('createAd')}</h1>
        <p className="forum-text-secondary mt-2">{t('createAdDescription')}</p>
      </div>

      {/* Basic Info */}
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
          <CardDescription>{t('basicInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">{t('adTitle')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={t('adTitlePlaceholder')}
              maxLength={200}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">{t('adDescription')} *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('adDescriptionPlaceholder')}
              rows={6}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('location')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('country')} *</Label>
              <Select value={formData.country_id} onValueChange={(v) => handleInputChange('country_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.flag_emoji} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{t('region')}</Label>
              <Select 
                value={formData.region_id} 
                onValueChange={(v) => handleInputChange('region_id', v)}
                disabled={!formData.country_id || regions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectRegion')} />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">{t('city')}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={t('cityPlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="neighborhood">{t('neighborhood')}</Label>
              <Input
                id="neighborhood"
                value={formData.neighborhood}
                onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                placeholder={t('neighborhoodPlaceholder')}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="incall" 
                checked={formData.incall}
                onCheckedChange={(v) => handleInputChange('incall', v as boolean)}
              />
              <Label htmlFor="incall">{t('incall')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="outcall"
                checked={formData.outcall}
                onCheckedChange={(v) => handleInputChange('outcall', v as boolean)}
              />
              <Label htmlFor="outcall">{t('outcall')}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            {t('contactInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                value={formData.telegram}
                onChange={(e) => handleInputChange('telegram', e.target.value)}
                placeholder="@username"
              />
            </div>
            <div>
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Details */}
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('physicalDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="age">{t('age')}</Label>
              <Input
                id="age"
                type="number"
                min={18}
                max={99}
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="height">{t('height')} (cm)</Label>
              <Input
                id="height"
                type="number"
                min={100}
                max={250}
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="weight">{t('weight')} (kg)</Label>
              <Input
                id="weight"
                type="number"
                min={30}
                max={200}
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
              />
            </div>
            <div>
              <Label>{t('bodyType')}</Label>
              <Select value={formData.body_type} onValueChange={(v) => handleInputChange('body_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
                <SelectContent>
                  {bodyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`bodyTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('ethnicity')}</Label>
              <Select value={formData.ethnicity} onValueChange={(v) => handleInputChange('ethnicity', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
                <SelectContent>
                  {ethnicities.map((eth) => (
                    <SelectItem key={eth} value={eth}>
                      {t(`ethnicities.${eth}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('hairColor')}</Label>
              <Select value={formData.hair_color} onValueChange={(v) => handleInputChange('hair_color', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
                <SelectContent>
                  {hairColors.map((color) => (
                    <SelectItem key={color} value={color}>
                      {t(`hairColors.${color}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('eyeColor')}</Label>
              <Select value={formData.eye_color} onValueChange={(v) => handleInputChange('eye_color', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
                <SelectContent>
                  {hairColors.map((color) => (
                    <SelectItem key={color} value={color}>
                      {t(`eyeColors.${color}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardHeader>
          <CardTitle>{t('servicesOffered')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <Badge
                key={service.id}
                variant={formData.services.includes(service.name_key) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleServiceToggle(service.name_key)}
              >
                {t(`servicesList.${service.name_key}`, { defaultValue: service.name_key })}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rates */}
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t('rates')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('currency')}</Label>
            <Select value={formData.currency} onValueChange={(v) => handleInputChange('currency', v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {durations.map((duration) => (
              <div key={duration}>
                <Label>{t(`durations.${duration}`)}</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.rates[duration] || ''}
                  onChange={(e) => handleRateChange(duration, e.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {t('photos')}
          </CardTitle>
          <CardDescription>{t('photosDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {photosPreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-[hsl(var(--forum-surface-alt))]">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                {index === 0 && (
                  <Badge className="absolute bottom-1 left-1 text-xs">
                    {t('primaryPhoto')}
                  </Badge>
                )}
              </div>
            ))}
            
            {photos.length < 10 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-[hsl(var(--forum-border))] flex flex-col items-center justify-center cursor-pointer hover:border-[hsl(var(--forum-accent))] transition-colors">
                <Plus className="w-8 h-8 forum-text-muted" />
                <span className="text-sm forum-text-muted mt-2">{t('addPhoto')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('publishing')}
            </>
          ) : (
            t('publishAd')
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
