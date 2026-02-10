'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { BannerFallback, BannerPosition, BannerFormat } from '@/lib/supabase';
import {
  Code,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Save,
  X,
  Globe,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FallbackRow = BannerFallback & {
  zone?: { id: string; name: string; zone_type: string } | null;
};

export default function AdminFallbacksPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fallbacks, setFallbacks] = useState<FallbackRow[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string; zone_type: string }[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formZoneId, setFormZoneId] = useState<string>('global');
  const [formPosition, setFormPosition] = useState<BannerPosition>('header');
  const [formFormat, setFormFormat] = useState<BannerFormat>('728x90');
  const [formCodeHtml, setFormCodeHtml] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formPriority, setFormPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  // Preview
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (profile && profile.role !== 'admin') {
      router.push('/');
      toast.error('Solo administradores');
      return;
    }
    if (profile) fetchAll();
  }, [user, profile]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: fb }, { data: zn }] = await Promise.all([
      supabase
        .from('banner_fallbacks')
        .select('*, zone:banner_ad_zones(id, name, zone_type)')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('banner_ad_zones')
        .select('id, name, zone_type')
        .eq('is_active', true)
        .order('name'),
    ]);
    setFallbacks((fb as any) || []);
    setZones(zn || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormZoneId('global');
    setFormPosition('header');
    setFormFormat('728x90');
    setFormCodeHtml('');
    setFormLabel('');
    setFormActive(true);
    setFormPriority(0);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (fb: FallbackRow) => {
    setEditingId(fb.id);
    setFormZoneId(fb.zone_id || 'global');
    setFormPosition(fb.position);
    setFormFormat(fb.format);
    setFormCodeHtml(fb.code_html);
    setFormLabel(fb.label || '');
    setFormActive(fb.is_active);
    setFormPriority(fb.priority);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formCodeHtml.trim()) {
      toast.error('El código HTML/JS es requerido.');
      return;
    }

    setSaving(true);
    const payload: any = {
      zone_id: formZoneId === 'global' ? null : formZoneId,
      position: formPosition,
      format: formFormat,
      code_html: formCodeHtml,
      label: formLabel || null,
      is_active: formActive,
      priority: formPriority,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from('banner_fallbacks').update(payload).eq('id', editingId);
      if (error) { toast.error('Error al actualizar: ' + error.message); setSaving(false); return; }
      toast.success('Fallback actualizado.');
    } else {
      const { error } = await supabase.from('banner_fallbacks').insert(payload);
      if (error) { toast.error('Error al crear: ' + error.message); setSaving(false); return; }
      toast.success('Fallback creado.');
    }

    setSaving(false);
    resetForm();
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este fallback?')) return;
    const { error } = await supabase.from('banner_fallbacks').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Eliminado.');
    fetchAll();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('banner_fallbacks').update({ is_active: !current }).eq('id', id);
    if (error) { toast.error('Error'); return; }
    fetchAll();
  };

  if (!user || !profile || profile.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-6 w-full flex-1">
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Publicidad', href: '/admin/ads' },
          { label: 'Fallbacks' },
        ]} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Code className="h-6 w-6 text-[hsl(var(--forum-accent))]" />
              Gestión de Fallback Ads
            </h1>
            <p className="forum-text-secondary text-sm mt-1">
              Configura códigos de terceros (JuicyAds, etc.) que se muestran cuando no hay banners pagados.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Fallback
          </Button>
        </div>

        {/* CREATE/EDIT FORM */}
        {showForm && (
          <Card className="mb-6 border-[hsl(var(--forum-accent))]/30">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Fallback' : 'Nuevo Fallback'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Zona</Label>
                  <Select value={formZoneId} onValueChange={setFormZoneId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">
                        <span className="flex items-center gap-2"><Globe className="h-3 w-3" /> Global (todas las zonas)</span>
                      </SelectItem>
                      {zones.map(z => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.zone_type === 'home_country' ? '🏠' : '🏙️'} {z.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Etiqueta (opcional)</Label>
                  <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="Ej: JuicyAds Header" />
                </div>
                <div>
                  <Label>Posición</Label>
                  <Select value={formPosition} onValueChange={v => setFormPosition(v as BannerPosition)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="sidebar_top">Sidebar Top</SelectItem>
                      <SelectItem value="sidebar_bottom">Sidebar Bottom</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Formato</Label>
                  <Select value={formFormat} onValueChange={v => setFormFormat(v as BannerFormat)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="728x90">728×90 (Leaderboard)</SelectItem>
                      <SelectItem value="300x250">300×250 (Medium Rectangle)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridad</Label>
                  <Input type="number" value={formPriority} onChange={e => setFormPriority(Number(e.target.value))} />
                  <p className="text-[10px] forum-text-muted mt-0.5">Mayor número = mayor prioridad</p>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={formActive} onCheckedChange={setFormActive} />
                  <Label>Activo</Label>
                </div>
              </div>

              <div>
                <Label>Código HTML/JS</Label>
                <Textarea
                  value={formCodeHtml}
                  onChange={e => setFormCodeHtml(e.target.value)}
                  placeholder='<script src="https://juicyads.com/..." async></script>&#10;<ins id="..." data-slot="..."></ins>'
                  rows={8}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] forum-text-muted mt-1">Pega el código HTML/JavaScript de tu red publicitaria.</p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingId ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* LIST */}
        <Card>
          <CardHeader>
            <CardTitle>Fallbacks Configurados</CardTitle>
            <CardDescription>Los fallbacks con zona específica tienen prioridad sobre los globales.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 forum-text-muted">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
              </div>
            ) : fallbacks.length === 0 ? (
              <p className="text-center py-8 forum-text-muted">No hay fallbacks configurados.</p>
            ) : (
              <div className="space-y-3">
                {fallbacks.map(fb => (
                  <div key={fb.id} className={cn(
                    'p-4 border rounded-lg',
                    fb.is_active ? 'border-[hsl(var(--forum-border))]' : 'border-[hsl(var(--forum-border))] opacity-50'
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{fb.label || 'Sin etiqueta'}</span>
                          <Badge variant={fb.zone_id ? 'secondary' : 'outline'}>
                            {fb.zone_id ? (fb.zone as any)?.name : '🌐 Global'}
                          </Badge>
                          <Badge variant="outline">{fb.position}</Badge>
                          <Badge variant="outline">{fb.format}</Badge>
                          {!fb.is_active && <Badge variant="destructive">Inactivo</Badge>}
                          <span className="text-[10px] forum-text-muted">Prioridad: {fb.priority}</span>
                        </div>
                        <div className="mt-2 text-xs font-mono bg-[hsl(var(--forum-surface-alt))] p-2 rounded max-h-20 overflow-hidden text-ellipsis">
                          {fb.code_html.substring(0, 200)}{fb.code_html.length > 200 ? '...' : ''}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => toggleActive(fb.id, fb.is_active)}>
                          {fb.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(fb)}>
                          <Edit2 className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={() => handleDelete(fb.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
