'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  post_id: string | null;
  thread_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  assigned_to: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  reporter?: { username: string };
  reported_user?: { username: string };
  assignee?: { username: string };
}

const priorityColors = {
  low: 'bg-gray-500',
  normal: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

const statusColors = {
  pending: 'bg-yellow-500',
  reviewing: 'bg-blue-500',
  resolved: 'bg-green-500',
  dismissed: 'bg-gray-500'
};

export default function AdminReportsPage() {
  const { user, profile } = useAuth();
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations('adminReports');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(username),
        reported_user:profiles!reports_reported_user_id_fkey(username),
        assignee:profiles!reports_assigned_to_fkey(username)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query.limit(100);
    if (data) setReports(data);
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    if (profile && profile.role !== 'admin' && profile.role !== 'mod') {
      redirect('/');
    }
    fetchReports();
  }, [profile, statusFilter, fetchReports]);

  const handleAssignToMe = async (reportId: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ 
        assigned_to: user?.id,
        status: 'reviewing'
      })
      .eq('id', reportId);

    if (error) {
      toast.error(t('errorAssigning'));
      return;
    }

    toast.success(t('assigned'));
    fetchReports();
  };

  const handleResolve = async () => {
    if (!selectedReport) return;

    const { error } = await supabase
      .from('reports')
      .update({
        status: 'resolved',
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes || null
      })
      .eq('id', selectedReport.id);

    if (error) {
      toast.error(t('errorResolving'));
      return;
    }

    toast.success(t('resolved'));
    setSelectedReport(null);
    setResolutionNotes('');
    fetchReports();
  };

  const handleDismiss = async (reportId: string) => {
    const { error } = await supabase
      .from('reports')
      .update({
        status: 'dismissed',
        resolved_by: user?.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (error) {
      toast.error(t('errorDismissing'));
      return;
    }

    toast.success(t('dismissed'));
    fetchReports();
  };

  const handleChangePriority = async (reportId: string, priority: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ priority })
      .eq('id', reportId);

    if (error) {
      toast.error(t('errorPriority'));
      return;
    }

    toast.success(t('priorityUpdated'));
    fetchReports();
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'spam': return t('catSpam');
      case 'harassment': return t('catHarassment');
      case 'inappropriate': return t('catInappropriate');
      case 'scam': return t('catScam');
      default: return t('catOther');
    }
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'mod')) return null;

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const reviewingCount = reports.filter(r => r.status === 'reviewing').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Flag className="h-8 w-8 text-red-500" />
              {t('title')}
            </h1>
            <p className="forum-text-secondary">
              {pendingCount} {t('pending')} • {reviewingCount} {t('inReview')}
            </p>
          </div>
          <Link href="/admin">
            <Button variant="outline">{t('backToPanel')}</Button>
          </Link>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {t('pending')}
            </TabsTrigger>
            <TabsTrigger value="reviewing" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('inReview')}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {t('resolvedTab')}
            </TabsTrigger>
            <TabsTrigger value="all">{t('all')}</TabsTrigger>
          </TabsList>

          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardContent className="pt-6">
              {isLoading ? (
                <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
              ) : reports.length === 0 ? (
                <p className="text-center py-8 forum-text-muted">{t('noReports')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('priority')}</TableHead>
                      <TableHead>{t('category')}</TableHead>
                      <TableHead>{t('reported')}</TableHead>
                      <TableHead>{t('reason')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('assignedTo')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Select
                            value={report.priority}
                            onValueChange={(v) => handleChangePriority(report.id, v)}
                          >
                            <SelectTrigger className="w-24">
                              <Badge className={priorityColors[report.priority]}>
                                {report.priority}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">{t('low')}</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">{t('high')}</SelectItem>
                              <SelectItem value="urgent">{t('urgent')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryLabel(report.category)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Link 
                            href={`/user/${report.reported_user?.username}`}
                            className="text-[hsl(var(--forum-accent))] hover:underline"
                          >
                            @{report.reported_user?.username}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{report.reason}</div>
                          {report.details && (
                            <div className="text-xs forum-text-muted truncate">{report.details}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[report.status]}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {report.assignee?.username ? (
                            `@${report.assignee.username}`
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAssignToMe(report.id)}
                            >
                              {t('assignToMe')}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-sm forum-text-muted">
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: dateLocale })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {report.status !== 'resolved' && report.status !== 'dismissed' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-500"
                                  onClick={() => setSelectedReport(report)}
                                  title={t('resolve')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-500"
                                  onClick={() => handleDismiss(report.id)}
                                  title={t('dismiss')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Tabs>

        {/* Resolve Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('resolveReport')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium mb-2">{t('reportedUser')}: @{selectedReport?.reported_user?.username}</p>
                <p className="text-sm forum-text-muted">{t('reason')}: {selectedReport?.reason}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('resolutionNotes')}</label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={t('resolutionPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReport(null)}>{t('cancel')}</Button>
              <Button onClick={handleResolve}>{t('markResolved')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Footer />
    </div>
  );
}
