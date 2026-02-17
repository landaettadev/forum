'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { approveVerification, rejectVerification, resolveReport, fetchAdminData } from './actions';
import { Users, Flag, Shield, BarChart3, CheckCircle, XCircle, Eye, FolderOpen, History, AlertTriangle, Filter, Award, Megaphone, MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('admin');
  const [stats, setStats] = useState({ users: 0, reports: 0, verifications: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await fetchAdminData();
    if (data) {
      setStats(data.stats);
      setReports(data.reports);
      setVerifications(data.verifications);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (profile && profile.role !== 'admin' && profile.role !== 'mod') {
      router.push('/');
      toast.error(t('noPermission'));
      return;
    }
    if (profile) {
      fetchData();
    }
  }, [user, profile, router, t, fetchData]);

  const handleApproveVerification = async (id: string, userId: string) => {
    const result = await approveVerification(id, userId);
    if (!result.success) {
      toast.error(t('errorApprovingVerification'));
      return;
    }
    toast.success(t('approveSuccess'));
    fetchData();
  };

  const handleRejectVerification = async (id: string) => {
    const result = await rejectVerification(id);
    if (!result.success) {
      toast.error(t('errorRejectingVerification'));
      return;
    }
    toast.success(t('rejectSuccess'));
    fetchData();
  };

  const handleResolveReport = async (id: string) => {
    const result = await resolveReport(id);
    if (!result.success) {
      toast.error(t('errorResolvingReport'));
      return;
    }
    toast.success(t('resolveSuccess'));
    fetchData();
  };

  if (!user || !profile || (profile.role !== 'admin' && profile.role !== 'mod')) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs items={[{ label: t('title') }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
            {t('title')}
          </h1>
          <p className="forum-text-secondary">
            {t('description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
              <Users className="h-4 w-4 forum-text-muted" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingReports')}</CardTitle>
              <Flag className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reports}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingVerifications')}</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verifications}</div>
            </CardContent>
          </Card>
        </div>

        {profile.role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Link href="/admin/users">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Users className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
                  <div>
                    <CardTitle className="text-lg">{t('userManagement')}</CardTitle>
                    <CardDescription>{t('userManagementDesc')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/foros">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <FolderOpen className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
                  <div>
                    <CardTitle className="text-lg">{t('geoForumManagement')}</CardTitle>
                    <CardDescription>{t('geoForumManagementDesc')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/logs">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <History className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
                  <div>
                    <CardTitle className="text-lg">{t('moderationHistory')}</CardTitle>
                    <CardDescription>{t('moderationHistoryDesc')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/messages">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <MessageSquare className="h-8 w-8 text-indigo-500" />
                  <div>
                    <CardTitle className="text-lg">Visor de Mensajes</CardTitle>
                    <CardDescription>Ver historial de conversaciones y mensajes privados</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/warnings">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  <div>
                    <CardTitle className="text-lg">{t('warningSystem')}</CardTitle>
                    <CardDescription>{t('warningSystemDesc')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/filters">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Filter className="h-8 w-8 text-purple-500" />
                  <div>
                    <CardTitle className="text-lg">{t('contentFilters')}</CardTitle>
                    <CardDescription>{t('contentFiltersDesc')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/reports">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Flag className="h-8 w-8 text-red-500" />
                  <div>
                    <CardTitle className="text-lg">{t('reportCenter')}</CardTitle>
                    <CardDescription>{t('reportCenterDesc')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/suspensions">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Shield className="h-8 w-8 text-orange-500" />
                  <div>
                    <CardTitle className="text-lg">{t('suspensions')}</CardTitle>
                    <CardDescription>{t('suspensionsDesc')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/badges">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Award className="h-8 w-8 text-purple-500" />
                  <div>
                    <CardTitle className="text-lg">{t('badges')}</CardTitle>
                    <CardDescription>{t('badgesDesc')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/ads">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Megaphone className="h-8 w-8 text-green-500" />
                  <div>
                    <CardTitle className="text-lg">Publicidad</CardTitle>
                    <CardDescription>Gestionar banners, solicitudes y anuncios de terceros</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/settings">
              <Card className="hover:bg-[hsl(var(--forum-surface-alt))] transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Settings className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
                  <div>
                    <CardTitle className="text-lg">Configuración</CardTitle>
                    <CardDescription>Redes sociales y ajustes globales del sitio</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>
        )}

        <Tabs defaultValue="verificaciones" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="verificaciones">{t('verifications')}</TabsTrigger>
            <TabsTrigger value="reportes">{t('reports')}</TabsTrigger>
            <TabsTrigger value="stats">{t('stats')}</TabsTrigger>
          </TabsList>

          <TabsContent value="verificaciones">
            <Card>
              <CardHeader>
                <CardTitle>{t('verificationRequests')}</CardTitle>
                <CardDescription>
                  {t('verificationRequestsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
                ) : verifications.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">
                    {t('noPendingVerifications')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {verifications.map((verification) => (
                      <div
                        key={verification.id}
                        className="p-4 border border-[hsl(var(--forum-border))] rounded"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold mb-1">
                              @{verification.user?.username}
                            </div>
                            <div className="text-sm forum-text-muted">
                              {t('submitted')} {formatDistanceToNow(new Date(verification.created_at), { addSuffix: true, locale: dateLocale })}
                            </div>
                            {verification.photo_url && (
                              <div className="mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(verification.photo_url, '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('viewPhoto')}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-500 hover:text-green-600"
                              onClick={() => handleApproveVerification(verification.id, verification.user_id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t('approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleRejectVerification(verification.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {t('reject')}
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

          <TabsContent value="reportes">
            <Card>
              <CardHeader>
                <CardTitle>{t('pendingReports')}</CardTitle>
                <CardDescription>
                  {t('reviewCommunityReports')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
                ) : reports.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">
                    {t('noPendingReports')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 border border-[hsl(var(--forum-border))] rounded"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Flag className="h-4 w-4 text-red-500" />
                              <span className="font-semibold">{t('reportNum')} #{report.id.substring(0, 8)}</span>
                            </div>
                            <div className="text-sm forum-text-muted mb-2">
                              {t('reportedBy')} @{report.reporter?.username} • {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: dateLocale })}
                            </div>
                            <div className="text-sm">
                              <strong>{t('reason')}:</strong> {report.reason}
                            </div>
                            {report.details && (
                              <div className="text-sm mt-1 forum-text-secondary">
                                {report.details}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveReport(report.id)}
                            >
                              {t('resolve')}
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

          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('generalStats')}
                </CardTitle>
                <CardDescription>
                  {t('forumMetrics')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-[hsl(var(--forum-border))] rounded">
                    <div className="text-sm forum-text-muted mb-1">{t('totalUsers')}</div>
                    <div className="text-2xl font-bold">{stats.users}</div>
                  </div>
                  <div className="p-4 border border-[hsl(var(--forum-border))] rounded">
                    <div className="text-sm forum-text-muted mb-1">{t('pendingReports')}</div>
                    <div className="text-2xl font-bold">{stats.reports}</div>
                  </div>
                  <div className="p-4 border border-[hsl(var(--forum-border))] rounded">
                    <div className="text-sm forum-text-muted mb-1">{t('pendingVerifications')}</div>
                    <div className="text-2xl font-bold">{stats.verifications}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
