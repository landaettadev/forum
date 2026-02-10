'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Filter, Plus, Trash2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { invalidateFilterCache } from '@/lib/content-filter';

interface ContentFilter {
  id: string;
  filter_type: 'word' | 'url' | 'phrase';
  pattern: string;
  replacement: string;
  is_regex: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string;
  creator?: { username: string };
}

export default function AdminFiltersPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('adminFilters');
  const [filters, setFilters] = useState<ContentFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Form state
  const [filterType, setFilterType] = useState<'word' | 'url' | 'phrase'>('word');
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('xxx');
  const [isRegex, setIsRegex] = useState(false);

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      redirect('/');
    }
    fetchFilters();
  }, [profile]);

  const fetchFilters = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('content_filters')
      .select(`
        *,
        creator:profiles!content_filters_created_by_fkey(username)
      `)
      .order('created_at', { ascending: false });

    if (data) setFilters(data);
    setIsLoading(false);
  };

  const handleAddFilter = async () => {
    if (!pattern.trim()) {
      toast.error(t('patternRequired'));
      return;
    }

    // Validate regex if enabled
    if (isRegex) {
      try {
        new RegExp(pattern);
      } catch {
        toast.error(t('invalidRegex'));
        return;
      }
    }

    const { error } = await supabase.from('content_filters').insert({
      filter_type: filterType,
      pattern,
      replacement: replacement || 'xxx',
      is_regex: isRegex,
      is_active: true,
      created_by: user?.id
    });

    if (error) {
      toast.error(t('errorCreating'));
      return;
    }

    // Log moderation action
    await supabase.from('moderation_logs').insert({
      moderator_id: user?.id,
      action: 'add_filter',
      reason: `${t('filterAdded')}: ${pattern}`,
      details: { filter_type: filterType, pattern, is_regex: isRegex }
    });

    invalidateFilterCache();
    toast.success(t('created'));
    setShowAddDialog(false);
    resetForm();
    fetchFilters();
  };

  const handleToggleFilter = async (filterId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('content_filters')
      .update({ is_active: isActive })
      .eq('id', filterId);

    if (error) {
      toast.error(t('errorUpdating'));
      return;
    }

    invalidateFilterCache();
    toast.success(isActive ? t('activated') : t('deactivated'));
    fetchFilters();
  };

  const handleDeleteFilter = async (filterId: string, pattern: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const { error } = await supabase
      .from('content_filters')
      .delete()
      .eq('id', filterId);

    if (error) {
      toast.error(t('errorDeleting'));
      return;
    }

    // Log moderation action
    await supabase.from('moderation_logs').insert({
      moderator_id: user?.id,
      action: 'remove_filter',
      reason: `${t('filterRemoved')}: ${pattern}`
    });

    invalidateFilterCache();
    toast.success(t('deleted'));
    fetchFilters();
  };

  const resetForm = () => {
    setFilterType('word');
    setPattern('');
    setReplacement('xxx');
    setIsRegex(false);
  };

  const getFilterTypeLabel = (type: string) => {
    switch (type) {
      case 'word': return t('typeWord');
      case 'url': return 'URL';
      case 'phrase': return t('typePhrase');
      default: return type;
    }
  };

  if (!profile || profile.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Filter className="h-8 w-8 text-[hsl(var(--forum-accent))]" />
              {t('title')}
            </h1>
            <p className="forum-text-secondary">{t('description')}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline">{t('backToPanel')}</Button>
            </Link>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('newFilter')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('newFilter')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">{t('filterType')}</label>
                    <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="word">{t('typeWord')}</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="phrase">{t('typePhrase')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('patternLabel')}</label>
                    <Input
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      placeholder={isRegex ? t('regexPlaceholder') : t('patternPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('replacement')}</label>
                    <Input
                      value={replacement}
                      onChange={(e) => setReplacement(e.target.value)}
                      placeholder="xxx"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{t('useRegex')}</label>
                    <Switch checked={isRegex} onCheckedChange={setIsRegex} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('cancel')}</Button>
                  <Button onClick={handleAddFilter}>{t('createFilter')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="forum-surface border-[hsl(var(--forum-border))] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('howFiltersWork')}
            </CardTitle>
            <CardDescription>
              {t('howFiltersWorkDesc')}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="forum-surface border-[hsl(var(--forum-border))]">
          <CardHeader>
            <CardTitle>{t('activeFilters')} ({filters.filter(f => f.is_active).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
            ) : filters.length === 0 ? (
              <p className="text-center py-8 forum-text-muted">{t('noFilters')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('pattern')}</TableHead>
                    <TableHead>{t('replacement')}</TableHead>
                    <TableHead>Regex</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('createdBy')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filters.map((filter) => (
                    <TableRow key={filter.id}>
                      <TableCell>
                        <Badge variant="outline">{getFilterTypeLabel(filter.filter_type)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-xs truncate">
                        {filter.pattern}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {filter.replacement}
                      </TableCell>
                      <TableCell>
                        {filter.is_regex ? (
                          <Badge className="bg-purple-500">{t('yes')}</Badge>
                        ) : (
                          <span className="text-xs forum-text-muted">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={filter.is_active}
                          onCheckedChange={(checked) => handleToggleFilter(filter.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-sm forum-text-muted">
                        @{filter.creator?.username}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => handleDeleteFilter(filter.id, filter.pattern)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
