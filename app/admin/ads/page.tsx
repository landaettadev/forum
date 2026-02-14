'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { POSITION_LABELS } from '@/lib/banner-pricing';
import type { BannerBooking, BannerPosition } from '@/lib/supabase';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Code,
  BarChart3,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type BookingRow = BannerBooking & {
  user?: { id: string; username: string; avatar_url: string | null };
  zone?: { id: string; name: string; zone_type: string; country?: { name: string; flag_emoji: string } };
};

export default function AdminAdsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pendingBookings, setPendingBookings] = useState<BookingRow[]>([]);
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);
  const [stats, setStats] = useState({ pending: 0, active: 0, totalRevenue: 0, totalBookings: 0 });

  // Filters
  const [countries, setCountries] = useState<{ id: string; name: string; flag_emoji: string }[]>([]);
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Calendar view
  const [calendarZones, setCalendarZones] = useState<any[]>([]);
  const [calendarZoneId, setCalendarZoneId] = useState('');
  const [calendarPosition, setCalendarPosition] = useState<BannerPosition | ''>('');
  const [calendarOccupied, setCalendarOccupied] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Edit modal
  const [editBooking, setEditBooking] = useState<BookingRow | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (profile && profile.role !== 'admin' && profile.role !== 'mod') {
      router.push('/');
      toast.error('Sin permisos');
      return;
    }
    if (profile) fetchAll();
  }, [user, profile, authLoading]);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: pending },
      { data: all },
      { data: countriesData },
    ] = await Promise.all([
      supabase
        .from('banner_bookings')
        .select('*, user:profiles(id, username, avatar_url), zone:banner_ad_zones(id, name, zone_type, country:countries(name, flag_emoji))')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('banner_bookings')
        .select('*, user:profiles(id, username, avatar_url), zone:banner_ad_zones(id, name, zone_type, country:countries(name, flag_emoji))')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('countries').select('id, name, flag_emoji').order('name'),
    ]);

    setPendingBookings((pending as any) || []);
    setAllBookings((all as any) || []);
    setCountries(countriesData || []);

    // Compute stats
    const active = (all || []).filter((b: any) => b.status === 'active').length;
    const revenue = (all || []).filter((b: any) => ['active', 'approved', 'expired'].includes(b.status)).reduce((sum: number, b: any) => sum + Number(b.price_usd || 0), 0);
    setStats({
      pending: (pending || []).length,
      active,
      totalRevenue: revenue,
      totalBookings: (all || []).length,
    });
    setLoading(false);
  };

  const handleApprove = async (bookingId: string) => {
    const { error } = await supabase
      .from('banner_bookings')
      .update({
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) { toast.error('Error al aprobar'); return; }
    toast.success('Booking aprobado. Se activará en la fecha de inicio.');
    fetchAll();
  };

  const handleReject = async (bookingId: string) => {
    const { error } = await supabase
      .from('banner_bookings')
      .update({
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) { toast.error('Error al rechazar'); return; }
    toast.success('Booking rechazado.');
    fetchAll();
  };

  const handleSaveEdit = async () => {
    if (!editBooking) return;
    setSaving(true);
    const updates: any = { updated_at: new Date().toISOString() };
    if (editNotes) updates.admin_notes = editNotes;
    if (editStartDate) updates.start_date = editStartDate;
    if (editEndDate) updates.end_date = editEndDate;

    const { error } = await supabase
      .from('banner_bookings')
      .update(updates)
      .eq('id', editBooking.id);

    if (error) { toast.error('Error al guardar'); setSaving(false); return; }
    toast.success('Booking actualizado.');
    setEditBooking(null);
    setSaving(false);
    fetchAll();
  };

  const openEdit = (b: BookingRow) => {
    setEditBooking(b);
    setEditNotes(b.admin_notes || '');
    setEditStartDate(b.start_date);
    setEditEndDate(b.end_date);
  };

  // Calendar functions
  const loadCalendarZones = async (countryId: string) => {
    const { data } = await supabase
      .from('banner_ad_zones')
      .select('id, name, zone_type')
      .eq('country_id', countryId)
      .eq('is_active', true)
      .order('zone_type')
      .order('name');
    setCalendarZones(data || []);
  };

  const loadCalendarOccupied = async () => {
    if (!calendarZoneId || !calendarPosition) return;
    setLoadingCalendar(true);
    const { data } = await supabase.rpc('get_occupied_dates', {
      p_zone_id: calendarZoneId,
      p_position: calendarPosition,
    });
    setCalendarOccupied(data || []);
    setLoadingCalendar(false);
  };

  useEffect(() => {
    if (calendarZoneId && calendarPosition) loadCalendarOccupied();
  }, [calendarZoneId, calendarPosition]);

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'approved': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'expired': return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
      default: return '';
    }
  };

  // Filter all bookings
  const filteredBookings = allBookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    return true;
  });

  if (!user || !profile || (profile.role !== 'admin' && profile.role !== 'mod')) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Publicidad' }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
            Gestión de Publicidad
          </h1>
          <p className="forum-text-secondary">Administra banners, solicitudes y códigos de terceros.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.active}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-[hsl(var(--forum-accent))]" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">${stats.totalRevenue}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <BarChart3 className="h-4 w-4 forum-text-muted" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalBookings}</div></CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <div className="flex gap-3 mb-6">
          <Link href="/admin/ads/fallbacks">
            <Button variant="outline" size="sm"><Code className="h-4 w-4 mr-2" /> Gestionar Fallbacks</Button>
          </Link>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pending">Pendientes ({stats.pending})</TabsTrigger>
            <TabsTrigger value="all">Todos los Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
          </TabsList>

          {/* PENDING TAB */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes Pendientes</CardTitle>
                <CardDescription>Aprueba o rechaza las solicitudes de publicidad.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8 forum-text-muted"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...</div>
                ) : pendingBookings.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">No hay solicitudes pendientes.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingBookings.map(b => (
                      <div key={b.id} className="p-4 border border-[hsl(var(--forum-border))] rounded-lg">
                        <div className="flex items-start gap-4">
                          {/* User info */}
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={b.user?.avatar_url || undefined} />
                            <AvatarFallback>{b.user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">@{b.user?.username}</span>
                              <Badge className={statusColor(b.status)}>{b.status}</Badge>
                              <span className="text-xs forum-text-muted">
                                {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: es })}
                              </span>
                            </div>
                            <div className="text-sm mt-1 space-y-0.5">
                              <div><strong>Zona:</strong> {(b.zone as any)?.name} — {(b.zone as any)?.country?.flag_emoji} {(b.zone as any)?.country?.name}</div>
                              <div><strong>Posición:</strong> {POSITION_LABELS[b.position as BannerPosition] || b.position} ({b.format})</div>
                              <div><strong>Fechas:</strong> {b.start_date} → {b.end_date} ({b.duration_days} días)</div>
                              <div><strong>Precio:</strong> <span className="text-[hsl(var(--forum-accent))] font-bold">${b.price_usd} USD</span></div>
                            </div>
                            {/* Banner preview */}
                            {b.image_url && (
                              <div className="mt-2">
                                <img src={b.image_url} alt="Banner" className="max-w-full max-h-[120px] rounded border border-[hsl(var(--forum-border))]" />
                              </div>
                            )}
                            {b.click_url && (
                              <div className="mt-1 text-xs">
                                <a href={b.click_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--forum-link))] flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" /> {b.click_url}
                                </a>
                              </div>
                            )}
                          </div>
                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(b.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => handleReject(b.id)}>
                              <XCircle className="h-4 w-4 mr-1" /> Rechazar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                              Editar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ALL BOOKINGS TAB */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Todos los Bookings</CardTitle>
                <div className="flex gap-3 mt-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                      <SelectItem value="expired">Expirado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8 forum-text-muted"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...</div>
                ) : filteredBookings.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">No hay bookings.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(var(--forum-border))]">
                          <th className="text-left p-2">Usuario</th>
                          <th className="text-left p-2">Zona</th>
                          <th className="text-left p-2">Posición</th>
                          <th className="text-left p-2">Fechas</th>
                          <th className="text-left p-2">Precio</th>
                          <th className="text-left p-2">Estado</th>
                          <th className="text-left p-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map(b => (
                          <tr key={b.id} className="border-b border-[hsl(var(--forum-border))] hover:bg-[hsl(var(--forum-surface-hover))]">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={b.user?.avatar_url || undefined} />
                                  <AvatarFallback className="text-[9px]">{b.user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs">@{b.user?.username}</span>
                              </div>
                            </td>
                            <td className="p-2 text-xs">{(b.zone as any)?.name}</td>
                            <td className="p-2 text-xs">{b.position} ({b.format})</td>
                            <td className="p-2 text-xs">{b.start_date} → {b.end_date}</td>
                            <td className="p-2 text-xs font-bold">${b.price_usd}</td>
                            <td className="p-2"><Badge className={cn('text-[10px]', statusColor(b.status))}>{b.status}</Badge></td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                {b.image_url && (
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => window.open(b.image_url!, '_blank')}>
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(b)}>
                                  Editar
                                </Button>
                                {b.status === 'pending' && (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => handleApprove(b.id)}>✓</Button>
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" onClick={() => handleReject(b.id)}>✗</Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CALENDAR TAB */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Calendario de Ocupación</CardTitle>
                <CardDescription>Selecciona un país, zona y posición para ver los slots ocupados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="w-48">
                    <Label>País</Label>
                    <Select onValueChange={(v) => { loadCalendarZones(v); setCalendarZoneId(''); setCalendarOccupied([]); }}>
                      <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
                      <SelectContent>
                        {countries.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.flag_emoji} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-64">
                    <Label>Zona</Label>
                    <Select value={calendarZoneId} onValueChange={setCalendarZoneId}>
                      <SelectTrigger><SelectValue placeholder="Zona" /></SelectTrigger>
                      <SelectContent>
                        {calendarZones.map((z: any) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.zone_type === 'home_country' ? '🏠' : '🏙️'} {z.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Label>Posición</Label>
                    <Select value={calendarPosition} onValueChange={(v) => setCalendarPosition(v as BannerPosition)}>
                      <SelectTrigger><SelectValue placeholder="Posición" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="sidebar_top">Sidebar Top</SelectItem>
                        <SelectItem value="sidebar_bottom">Sidebar Bottom</SelectItem>
                        <SelectItem value="footer">Footer</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loadingCalendar && <div className="flex items-center gap-2 forum-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>}

                {calendarOccupied.length > 0 ? (
                  <div className="space-y-2">
                    {calendarOccupied.map((occ: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 border border-[hsl(var(--forum-border))] rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={occ.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{occ.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">@{occ.username}</div>
                          <div className="text-xs forum-text-muted">{occ.start_date} → {occ.end_date}</div>
                        </div>
                        <Badge className={statusColor(occ.status)}>{occ.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : calendarZoneId && calendarPosition && !loadingCalendar ? (
                  <p className="text-center py-4 forum-text-muted">No hay reservas para esta combinación.</p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* EDIT MODAL */}
        {editBooking && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditBooking(null)}>
            <div className="bg-background rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Editar Booking</h3>
              <div className="space-y-4">
                <div className="text-sm">
                  <strong>Usuario:</strong> @{editBooking.user?.username}<br />
                  <strong>Zona:</strong> {(editBooking.zone as any)?.name}<br />
                  <strong>Formato:</strong> {editBooking.format} — {editBooking.position}<br />
                  <strong>Precio:</strong> ${editBooking.price_usd}
                </div>
                {editBooking.image_url && (
                  <img src={editBooking.image_url} alt="Banner" className="max-w-full rounded border" />
                )}
                <div>
                  <Label>Fecha inicio</Label>
                  <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
                </div>
                <div>
                  <Label>Notas del admin</Label>
                  <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notas internas..." rows={3} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={editBooking.status}
                    onValueChange={(v) => setEditBooking({ ...editBooking, status: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                      <SelectItem value="expired">Expirado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditBooking(null)}>Cancelar</Button>
                  <Button onClick={handleSaveEdit} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
