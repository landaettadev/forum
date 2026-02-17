'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Settings, Twitter, Instagram, Send, Music2, MessageCircle, Globe, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface SiteSettings {
  social_twitter: string;
  social_instagram: string;
  social_telegram: string;
  social_tiktok: string;
  social_discord: string;
  social_reddit: string;
}

export default function AdminSettingsPage() {
  const t = useTranslations('admin');
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    social_twitter: '',
    social_instagram: '',
    social_telegram: '',
    social_tiktok: '',
    social_discord: '',
    social_reddit: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .like('key', 'social_%');

      if (error) throw error;

      const newSettings: SiteSettings = { ...settings };
      data?.forEach((row) => {
        if (row.key in newSettings) {
          newSettings[row.key as keyof SiteSettings] = row.value || '';
        }
      });
      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (error) throw error;
      }

      toast.success('Configuración guardada');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (!user || profile?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="forum-text-muted">{t('noPermission')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const socialFields = [
    { key: 'social_twitter', label: 'Twitter / X', icon: Twitter, placeholder: 'https://twitter.com/username' },
    { key: 'social_instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/username' },
    { key: 'social_telegram', label: 'Telegram', icon: Send, placeholder: 'https://t.me/channel' },
    { key: 'social_tiktok', label: 'TikTok', icon: Music2, placeholder: 'https://tiktok.com/@username' },
    { key: 'social_discord', label: 'Discord', icon: MessageCircle, placeholder: 'https://discord.gg/invite' },
    { key: 'social_reddit', label: 'Reddit', icon: Globe, placeholder: 'https://reddit.com/r/community' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-[hsl(var(--forum-accent))]" />
            Configuración del Sitio
          </h1>
          <p className="text-sm forum-text-muted mt-1">
            Configura las redes sociales y otros ajustes globales
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm">
            ← Volver al panel
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Redes Sociales
          </CardTitle>
          <CardDescription>
            Configura los enlaces a las redes sociales que aparecerán en el footer del sitio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {socialFields.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  type="url"
                  placeholder={field.placeholder}
                  value={settings[field.key as keyof SiteSettings]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              </div>
            );
          })}

          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
