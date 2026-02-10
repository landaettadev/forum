'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff, Plus, Trash2, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { ZoneAlert } from '@/lib/supabase';

type SimpleRegion = {
  id: string;
  name: string;
  slug: string;
};

type SimpleCountry = {
  id: string;
  name: string;
  slug: string;
  flag_emoji?: string;
};

type ZoneAlertsConfigProps = {
  countries: SimpleCountry[];
};

export function ZoneAlertsConfig({ countries }: ZoneAlertsConfigProps) {
  const t = useTranslations('alerts');
  const { user } = useAuth();
  
  const [alerts, setAlerts] = useState<ZoneAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // New alert form state
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [regions, setRegions] = useState<SimpleRegion[]>([]);

  useEffect(() => {
    if (user) {
      loadAlerts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCountry) {
      loadRegions(selectedCountry);
    } else {
      setRegions([]);
      setSelectedRegion('all');
    }
  }, [selectedCountry]);

  const loadAlerts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('zone_alerts')
        .select(`
          *,
          country:countries (
            id,
            name,
            slug,
            flag_emoji
          ),
          region:regions (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error(t('errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadRegions = async (countryId: string) => {
    const { data } = await supabase
      .from('regions')
      .select('id, name, slug')
      .eq('country_id', countryId)
      .order('name');
    setRegions(data || []);
  };

  const addAlert = async () => {
    if (!user || !selectedCountry) {
      toast.error(t('selectCountry'));
      return;
    }

    // Check if alert already exists
    const regionId = selectedRegion && selectedRegion !== 'all' ? selectedRegion : null;
    const existingAlert = alerts.find(a => 
      a.country_id === selectedCountry && 
      (regionId ? a.region_id === regionId : !a.region_id)
    );

    if (existingAlert) {
      toast.error(t('alertExists'));
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('zone_alerts')
        .insert({
          user_id: user.id,
          country_id: selectedCountry,
          region_id: regionId,
          is_active: true,
          notify_push: true,
          notify_email: false,
        })
        .select(`
          *,
          country:countries (
            id,
            name,
            slug,
            flag_emoji
          ),
          region:regions (
            id,
            name,
            slug
          )
        `)
        .single();

      if (error) throw error;
      
      setAlerts(prev => [data, ...prev]);
      setSelectedCountry('');
      setSelectedRegion('all');
      toast.success(t('alertAdded'));
    } catch (error) {
      console.error('Error adding alert:', error);
      toast.error(t('errorAdding'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('zone_alerts')
        .update({ is_active: isActive })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_active: isActive } : a
      ));
      
      toast.success(isActive ? t('alertEnabled') : t('alertDisabled'));
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error(t('errorUpdating'));
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('zone_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success(t('alertDeleted'));
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error(t('errorDeleting'));
    }
  };

  if (!user) {
    return (
      <Card className="forum-surface border-[hsl(var(--forum-border))]">
        <CardContent className="p-6 text-center">
          <Bell className="w-12 h-12 mx-auto forum-text-muted mb-4" />
          <p className="forum-text-muted">{t('loginRequired')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="forum-surface border-[hsl(var(--forum-border))]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new alert form */}
        <div className="p-4 rounded-lg bg-[hsl(var(--forum-surface-alt))] space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('addAlert')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
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
              <Select 
                value={selectedRegion} 
                onValueChange={setSelectedRegion}
                disabled={!selectedCountry || regions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('allRegions')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRegions')}</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={addAlert} disabled={!selectedCountry || isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('add')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Existing alerts list */}
        <div className="space-y-3">
          <h3 className="font-medium">{t('yourAlerts')}</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin forum-text-muted" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="w-12 h-12 mx-auto forum-text-muted mb-4" />
              <p className="forum-text-muted">{t('noAlerts')}</p>
              <p className="forum-text-secondary text-sm mt-1">{t('noAlertsDescription')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-[hsl(var(--forum-border))] bg-[hsl(var(--forum-surface))]"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 forum-text-muted" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {alert.country?.flag_emoji} {alert.country?.name}
                        </span>
                        {alert.region && (
                          <Badge variant="outline" className="text-xs">
                            {alert.region.name}
                          </Badge>
                        )}
                        {!alert.region && (
                          <Badge variant="secondary" className="text-xs">
                            {t('allRegions')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs forum-text-muted">
                        {alert.is_active ? t('active') : t('paused')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAlert(alert.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
