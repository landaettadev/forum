'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, MapPin, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminForosPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const t = useTranslations('adminGeoForums');
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddRegionOpen, setIsAddRegionOpen] = useState(false);
  const [isEditRegionOpen, setIsEditRegionOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [editingRegion, setEditingRegion] = useState<any>(null);
  
  const [newRegion, setNewRegion] = useState({
    name: '',
    name_es: '',
    slug: '',
    country_id: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (profile && profile.role !== 'admin') {
      router.push('/');
      toast.error(t('noPermission'));
      return;
    }

    if (profile) {
      fetchData();
    }
  }, [user, profile, router]);

  const fetchData = async () => {
    setLoading(true);

    const [
      { data: countriesData },
      { data: regionsData },
    ] = await Promise.all([
      supabase.from('countries').select('*').order('name_es'),
      supabase.from('regions').select('*, country:countries(name_es, slug, flag_emoji)').order('country_id, display_order'),
    ]);

    setCountries(countriesData || []);
    setRegions(regionsData || []);
    setLoading(false);
  };

  const handleAddRegion = async () => {
    if (!newRegion.name || !newRegion.name_es || !newRegion.slug || !newRegion.country_id) {
      toast.error(t('fillAllFields'));
      return;
    }

    const { data: maxOrder } = await supabase
      .from('regions')
      .select('display_order')
      .eq('country_id', newRegion.country_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = maxOrder ? maxOrder.display_order + 1 : 1;

    const { error } = await supabase
      .from('regions')
      .insert({
        ...newRegion,
        name_en: newRegion.name,
        display_order: displayOrder,
      });

    if (error) {
      toast.error(t('errorCreatingRegion') + ': ' + error.message);
      return;
    }

    toast.success(t('regionCreated'));
    setIsAddRegionOpen(false);
    setNewRegion({ name: '', name_es: '', slug: '', country_id: '' });
    fetchData();
  };

  const handleEditRegion = async () => {
    if (!editingRegion) return;

    const { error } = await supabase
      .from('regions')
      .update({
        name: editingRegion.name,
        name_es: editingRegion.name_es,
        name_en: editingRegion.name,
        slug: editingRegion.slug,
      })
      .eq('id', editingRegion.id);

    if (error) {
      toast.error(t('errorUpdatingRegion') + ': ' + error.message);
      return;
    }

    toast.success(t('regionUpdated'));
    setIsEditRegionOpen(false);
    setEditingRegion(null);
    fetchData();
  };

  const handleDeleteRegion = async (regionId: string, regionName: string) => {
    if (!confirm(`${t('confirmDeleteRegion')} "${regionName}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('regions')
      .delete()
      .eq('id', regionId);

    if (error) {
      toast.error(t('errorDeletingRegion') + ': ' + error.message);
      return;
    }

    toast.success(t('regionDeleted'));
    fetchData();
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--forum-accent))] mx-auto"></div>
            <p className="mt-4 forum-text-muted">{t('loading')}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const filteredRegions = selectedCountry
    ? regions.filter(r => r.country_id === selectedCountry)
    : regions;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="mb-6">
          <Link 
            href="/admin" 
            className="inline-flex items-center gap-1 text-sm forum-text-muted hover:text-[hsl(var(--forum-accent))] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToPanel')}
          </Link>

          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Globe className="h-8 w-8" />
            {t('title')}
          </h1>
          <p className="forum-text-secondary">
            {t('description')}
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('regionsAndSubforums')}</CardTitle>
                  <CardDescription>
                    {t('regionsDesc')}
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddRegionOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addRegion')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>{t('filterByCountry')}</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('allCountries')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCountries')}</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.flag_emoji} {country.name_es}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {filteredRegions.length === 0 ? (
                  <div className="text-center py-8 forum-text-muted">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t('noRegions')}</p>
                  </div>
                ) : (
                  filteredRegions.map((region) => (
                    <div
                      key={region.id}
                      className="flex items-center justify-between p-4 border border-[hsl(var(--forum-border))] rounded-lg hover:bg-[hsl(var(--forum-surface-hover))] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                        <div>
                          <div className="font-semibold">{region.name_es}</div>
                          <div className="text-sm forum-text-muted">
                            {region.country?.flag_emoji} {region.country?.name_es} • /{region.country?.slug}/{region.slug}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingRegion(region);
                            setIsEditRegionOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRegion(region.id, region.name_es)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('stats')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-[hsl(var(--forum-border))] rounded-lg">
                  <div className="text-2xl font-bold">{countries.length}</div>
                  <div className="text-sm forum-text-muted">{t('countries')}</div>
                </div>
                <div className="p-4 border border-[hsl(var(--forum-border))] rounded-lg">
                  <div className="text-2xl font-bold">{regions.length}</div>
                  <div className="text-sm forum-text-muted">{t('regionsCities')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />

      {/* Add Region Dialog */}
      <Dialog open={isAddRegionOpen} onOpenChange={setIsAddRegionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addNewRegion')}</DialogTitle>
            <DialogDescription>
              {t('addNewRegionDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('country')}</Label>
              <Select 
                value={newRegion.country_id} 
                onValueChange={(value) => setNewRegion({ ...newRegion, country_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.flag_emoji} {country.name_es}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('nameSpanish')}</Label>
              <Input
                value={newRegion.name_es}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewRegion({ 
                    ...newRegion, 
                    name_es: value,
                    name: value,
                    slug: generateSlug(value)
                  });
                }}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={newRegion.slug}
                onChange={(e) => setNewRegion({ ...newRegion, slug: e.target.value })}
                placeholder="ciudad-de-mexico"
              />
              <p className="text-xs forum-text-muted mt-1">
                {t('slugHint')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRegionOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddRegion}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createRegion')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Region Dialog */}
      <Dialog open={isEditRegionOpen} onOpenChange={setIsEditRegionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editRegion')}</DialogTitle>
            <DialogDescription>
              {t('editRegionDesc')}
            </DialogDescription>
          </DialogHeader>

          {editingRegion && (
            <div className="space-y-4">
              <div>
                <Label>{t('nameSpanish')}</Label>
                <Input
                  value={editingRegion.name_es}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditingRegion({ 
                      ...editingRegion, 
                      name_es: value,
                      name: value,
                    });
                  }}
                  placeholder={t('namePlaceholder')}
                />
              </div>

              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={editingRegion.slug}
                  onChange={(e) => setEditingRegion({ ...editingRegion, slug: e.target.value })}
                  placeholder="ciudad-de-mexico"
                />
              </div>

              <div className="p-3 bg-[hsl(var(--forum-surface-alt))] rounded-lg">
                <div className="text-sm font-medium mb-1">{t('country')}</div>
                <div className="text-sm forum-text-muted">
                  {editingRegion.country?.flag_emoji} {editingRegion.country?.name_es}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRegionOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleEditRegion}>
              <Edit className="h-4 w-4 mr-2" />
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
