'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { escapeLikePattern } from '@/lib/sanitize';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Award, Plus, Edit, Trash2, Search,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface CustomBadge {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string;
  color: string;
  bg_color: string;
  badge_type: 'positive' | 'negative' | 'neutral' | 'special';
  is_active: boolean;
  can_be_assigned_by: 'admin' | 'super_mod' | 'mod';
  display_order: number;
}

interface UserBadgeAssignment {
  id: string;
  user_id: string;
  badge_id: string;
  assigned_by: string;
  assigned_at: string;
  reason: string | null;
  expires_at: string | null;
  is_active: boolean;
  user?: { username: string };
  badge?: CustomBadge;
  assigner?: { username: string };
}

const badgeTypeColors = {
  positive: 'bg-green-500',
  negative: 'bg-red-500',
  neutral: 'bg-gray-500',
  special: 'bg-purple-500'
};

const _badgeTypeLabelsEs: Record<string, string> = {
  positive: 'Positiva',
  negative: 'Negativa',
  neutral: 'Neutral',
  special: 'Especial'
};

export default function AdminBadgesPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('adminBadges');
  const badgeTypeLabels: Record<string, string> = {
    positive: t('typePositive'),
    negative: t('typeNegative'),
    neutral: t('typeNeutral'),
    special: t('typeSpecial')
  };
  const [badges, setBadges] = useState<CustomBadge[]>([]);
  const [assignments, setAssignments] = useState<UserBadgeAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState<CustomBadge | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for badge creation
  const [badgeName, setBadgeName] = useState('');
  const [badgeDisplayName, setBadgeDisplayName] = useState('');
  const [badgeDescription, setBadgeDescription] = useState('');
  const [badgeIcon, setBadgeIcon] = useState('award');
  const [badgeColor, setBadgeColor] = useState('purple');
  const [badgeType, setBadgeType] = useState<'positive' | 'negative' | 'neutral' | 'special'>('positive');
  const [badgePermission, setBadgePermission] = useState<'admin' | 'super_mod' | 'mod'>('mod');

  // Form state for assignment
  const [targetUsername, setTargetUsername] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [assignReason, setAssignReason] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'admin' && profile.role !== 'mod' && !profile.moderator_type) {
      redirect('/');
    }
    fetchBadges();
    fetchAssignments();
  }, [profile]);

  const fetchBadges = async () => {
    const { data } = await supabase
      .from('custom_badges')
      .select('*')
      .order('display_order');
    if (data) setBadges(data);
  };

  const fetchAssignments = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('user_custom_badges')
      .select(`
        *,
        user:profiles!user_custom_badges_user_id_fkey(username),
        badge:custom_badges(*),
        assigner:profiles!user_custom_badges_assigned_by_fkey(username)
      `)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(100);
    if (data) setAssignments(data);
    setIsLoading(false);
  };

  const canCreateBadges = profile?.role === 'admin';
  
  const canAssignBadge = (badge: CustomBadge) => {
    if (profile?.role === 'admin') return true;
    if (profile?.moderator_type === 'super' && badge.can_be_assigned_by !== 'admin') return true;
    if ((profile?.role === 'mod' || profile?.moderator_type) && badge.can_be_assigned_by === 'mod') return true;
    return false;
  };

  const handleCreateBadge = async () => {
    if (!badgeName.trim() || !badgeDisplayName.trim()) {
      toast.error(t('nameAndDisplayRequired'));
      return;
    }

    const { error } = await supabase.from('custom_badges').insert({
      name: badgeName.toLowerCase().replace(/\s+/g, '_'),
      display_name: badgeDisplayName,
      description: badgeDescription || null,
      icon: badgeIcon,
      color: badgeColor,
      bg_color: badgeColor,
      badge_type: badgeType,
      can_be_assigned_by: badgePermission,
      created_by: user?.id
    });

    if (error) {
      toast.error(t('errorCreating'));
      return;
    }

    toast.success(t('badgeCreated'));
    setShowCreateDialog(false);
    resetBadgeForm();
    fetchBadges();
  };

  const handleUpdateBadge = async () => {
    if (!editingBadge) return;

    const { error } = await supabase
      .from('custom_badges')
      .update({
        display_name: badgeDisplayName,
        description: badgeDescription || null,
        icon: badgeIcon,
        color: badgeColor,
        bg_color: badgeColor,
        badge_type: badgeType,
        can_be_assigned_by: badgePermission
      })
      .eq('id', editingBadge.id);

    if (error) {
      toast.error(t('errorUpdating'));
      return;
    }

    toast.success(t('badgeUpdated'));
    setEditingBadge(null);
    resetBadgeForm();
    fetchBadges();
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const { error } = await supabase.from('custom_badges').delete().eq('id', badgeId);
    if (error) {
      toast.error(t('errorDeleting'));
      return;
    }

    toast.success(t('badgeDeleted'));
    fetchBadges();
  };

  const handleToggleBadge = async (badge: CustomBadge) => {
    await supabase
      .from('custom_badges')
      .update({ is_active: !badge.is_active })
      .eq('id', badge.id);
    fetchBadges();
  };

  const handleAssignBadge = async () => {
    if (!targetUsername.trim() || !selectedBadgeId) {
      toast.error(t('userAndBadgeRequired'));
      return;
    }

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', targetUsername)
      .maybeSingle();

    if (!targetUser) {
      toast.error(t('userNotFound'));
      return;
    }

    const { error } = await supabase.from('user_custom_badges').insert({
      user_id: targetUser.id,
      badge_id: selectedBadgeId,
      assigned_by: user?.id,
      reason: assignReason || null
    });

    if (error) {
      if (error.code === '23505') {
        toast.error(t('userAlreadyHasBadge'));
      } else {
        toast.error(t('errorAssigning'));
      }
      return;
    }

    toast.success(t('badgeAssigned'));
    setShowAssignDialog(false);
    setTargetUsername('');
    setSelectedBadgeId('');
    setAssignReason('');
    fetchAssignments();
  };

  const handleRemoveBadge = async (assignmentId: string) => {
    await supabase
      .from('user_custom_badges')
      .update({ is_active: false })
      .eq('id', assignmentId);
    
    toast.success(t('badgeRemoved'));
    fetchAssignments();
  };

  const resetBadgeForm = () => {
    setBadgeName('');
    setBadgeDisplayName('');
    setBadgeDescription('');
    setBadgeIcon('award');
    setBadgeColor('purple');
    setBadgeType('positive');
    setBadgePermission('mod');
  };

  const openEditDialog = (badge: CustomBadge) => {
    setEditingBadge(badge);
    setBadgeName(badge.name);
    setBadgeDisplayName(badge.display_name);
    setBadgeDescription(badge.description || '');
    setBadgeIcon(badge.icon);
    setBadgeColor(badge.color);
    setBadgeType(badge.badge_type);
    setBadgePermission(badge.can_be_assigned_by);
  };

  const searchAssignments = async () => {
    if (!searchQuery.trim()) {
      fetchAssignments();
      return;
    }

    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', `%${escapeLikePattern(searchQuery)}%`);

    if (users && users.length > 0) {
      const userIds = users.map(u => u.id);
      const { data } = await supabase
        .from('user_custom_badges')
        .select(`
          *,
          user:profiles!user_custom_badges_user_id_fkey(username),
          badge:custom_badges(*),
          assigner:profiles!user_custom_badges_assigned_by_fkey(username)
        `)
        .in('user_id', userIds)
        .eq('is_active', true);
      if (data) setAssignments(data);
    } else {
      setAssignments([]);
    }
  };

  const isModerator = profile?.role === 'admin' || profile?.role === 'mod' || profile?.moderator_type;
  if (!isModerator) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Award className="h-8 w-8 text-purple-500" />
              {t('title')}
            </h1>
            <p className="forum-text-secondary">{t('description')}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline">{t('backToPanel')}</Button>
            </Link>
            {canCreateBadges && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('newBadge')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('createNewBadge')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">{t('internalName')}</label>
                        <Input
                          value={badgeName}
                          onChange={(e) => setBadgeName(e.target.value)}
                          placeholder="legendary_reviewer"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t('displayName')}</label>
                        <Input
                          value={badgeDisplayName}
                          onChange={(e) => setBadgeDisplayName(e.target.value)}
                          placeholder="Reseñador Legendario"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('descriptionLabel')}</label>
                      <Textarea
                        value={badgeDescription}
                        onChange={(e) => setBadgeDescription(e.target.value)}
                        placeholder={t('descriptionPlaceholder')}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">{t('icon')}</label>
                        <Select value={badgeIcon} onValueChange={setBadgeIcon}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="award">Award</SelectItem>
                            <SelectItem value="crown">Crown</SelectItem>
                            <SelectItem value="shield-check">Shield</SelectItem>
                            <SelectItem value="trophy">Trophy</SelectItem>
                            <SelectItem value="star">Star</SelectItem>
                            <SelectItem value="medal">Medal</SelectItem>
                            <SelectItem value="badge-check">Badge Check</SelectItem>
                            <SelectItem value="gem">Gem</SelectItem>
                            <SelectItem value="alert-triangle">Warning</SelectItem>
                            <SelectItem value="alert-octagon">Alert</SelectItem>
                            <SelectItem value="eye">Eye</SelectItem>
                            <SelectItem value="sparkles">Sparkles</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t('color')}</label>
                        <Select value={badgeColor} onValueChange={setBadgeColor}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="purple">{t('colorPurple')}</SelectItem>
                            <SelectItem value="green">{t('colorGreen')}</SelectItem>
                            <SelectItem value="blue">{t('colorBlue')}</SelectItem>
                            <SelectItem value="yellow">{t('colorYellow')}</SelectItem>
                            <SelectItem value="red">{t('colorRed')}</SelectItem>
                            <SelectItem value="orange">{t('colorOrange')}</SelectItem>
                            <SelectItem value="pink">{t('colorPink')}</SelectItem>
                            <SelectItem value="cyan">Cyan</SelectItem>
                            <SelectItem value="fuchsia">{t('colorFuchsia')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t('type')}</label>
                        <Select value={badgeType} onValueChange={(v: any) => setBadgeType(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="positive">{t('typePositive')}</SelectItem>
                            <SelectItem value="negative">{t('typeNegative')}</SelectItem>
                            <SelectItem value="neutral">{t('typeNeutral')}</SelectItem>
                            <SelectItem value="special">{t('typeSpecial')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('whoCanAssign')}</label>
                      <Select value={badgePermission} onValueChange={(v: any) => setBadgePermission(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mod">{t('anyMod')}</SelectItem>
                          <SelectItem value="super_mod">{t('superModOrAdmin')}</SelectItem>
                          <SelectItem value="admin">{t('adminOnly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('cancel')}</Button>
                    <Button onClick={handleCreateBadge}>{t('createBadge')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('assignBadge')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('assignBadgeToUser')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">{t('user')}</label>
                    <Input
                      value={targetUsername}
                      onChange={(e) => setTargetUsername(e.target.value)}
                      placeholder={t('usernamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('badge')}</label>
                    <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                      <SelectTrigger><SelectValue placeholder={t('selectBadge')} /></SelectTrigger>
                      <SelectContent>
                        {badges.filter(b => b.is_active && canAssignBadge(b)).map(badge => (
                          <SelectItem key={badge.id} value={badge.id}>
                            <span className="flex items-center gap-2">
                              <Badge className={`bg-${badge.color}-500 text-white text-xs`}>
                                {badge.display_name}
                              </Badge>
                              <span className="text-xs forum-text-muted">({badgeTypeLabels[badge.badge_type]})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('reasonOptional')}</label>
                    <Textarea
                      value={assignReason}
                      onChange={(e) => setAssignReason(e.target.value)}
                      placeholder={t('reasonPlaceholder')}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAssignDialog(false)}>{t('cancel')}</Button>
                  <Button onClick={handleAssignBadge}>{t('assign')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="assignments">{t('assignments')}</TabsTrigger>
            <TabsTrigger value="badges">{t('availableBadges')}</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 forum-text-muted" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchAssignments()}
                      placeholder={t('searchPlaceholder')}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={searchAssignments}>{t('search')}</Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 forum-text-muted">{t('loading')}</p>
                ) : assignments.length === 0 ? (
                  <p className="text-center py-8 forum-text-muted">{t('noAssignments')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('user')}</TableHead>
                        <TableHead>{t('badge')}</TableHead>
                        <TableHead>{t('type')}</TableHead>
                        <TableHead>{t('reason')}</TableHead>
                        <TableHead>{t('assignedBy')}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <Link 
                              href={`/user/${assignment.user?.username}`}
                              className="text-[hsl(var(--forum-accent))] hover:underline"
                            >
                              @{assignment.user?.username}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge className={`bg-${assignment.badge?.color}-500 text-white`}>
                              {assignment.badge?.display_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={badgeTypeColors[assignment.badge?.badge_type || 'neutral']}>
                              {badgeTypeLabels[assignment.badge?.badge_type || 'neutral']}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm forum-text-muted">
                            {assignment.reason || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            @{assignment.assigner?.username}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => handleRemoveBadge(assignment.id)}
                              title={t('removeBadge')}
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
          </TabsContent>

          <TabsContent value="badges">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardContent className="pt-6">
                <div className="grid gap-4">
                  {['positive', 'negative', 'neutral', 'special'].map(type => (
                    <div key={type}>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Badge className={badgeTypeColors[type as keyof typeof badgeTypeColors]}>
                          {badgeTypeLabels[type as keyof typeof badgeTypeLabels]}
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {badges.filter(b => b.badge_type === type).map(badge => (
                          <div 
                            key={badge.id} 
                            className={`p-3 rounded-lg border ${badge.is_active ? 'border-[hsl(var(--forum-border))]' : 'border-red-500/30 opacity-50'}`}
                          >
                            <div className="flex items-center justify-between">
                              <Badge className={`bg-${badge.color}-500 text-white`}>
                                {badge.display_name}
                              </Badge>
                              {canCreateBadges && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => openEditDialog(badge)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500"
                                    onClick={() => handleDeleteBadge(badge.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <p className="text-xs forum-text-muted mt-2">{badge.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs forum-text-muted">
                                {t('assignableBy')}: {badge.can_be_assigned_by === 'mod' ? t('moderators') : badge.can_be_assigned_by === 'super_mod' ? t('superMods') : t('admins')}
                              </span>
                              {canCreateBadges && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => handleToggleBadge(badge)}
                                >
                                  {badge.is_active ? t('deactivate') : t('activate')}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Badge Dialog */}
        <Dialog open={!!editingBadge} onOpenChange={(open) => !open && setEditingBadge(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('editBadge')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">{t('displayName')}</label>
                <Input
                  value={badgeDisplayName}
                  onChange={(e) => setBadgeDisplayName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('descriptionLabel')}</label>
                <Textarea
                  value={badgeDescription}
                  onChange={(e) => setBadgeDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('icon')}</label>
                  <Select value={badgeIcon} onValueChange={setBadgeIcon}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="award">Award</SelectItem>
                      <SelectItem value="crown">Crown</SelectItem>
                      <SelectItem value="shield-check">Shield</SelectItem>
                      <SelectItem value="trophy">Trophy</SelectItem>
                      <SelectItem value="star">Star</SelectItem>
                      <SelectItem value="medal">Medal</SelectItem>
                      <SelectItem value="badge-check">Badge Check</SelectItem>
                      <SelectItem value="gem">Gem</SelectItem>
                      <SelectItem value="alert-triangle">Warning</SelectItem>
                      <SelectItem value="alert-octagon">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('color')}</label>
                  <Select value={badgeColor} onValueChange={setBadgeColor}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purple">{t('colorPurple')}</SelectItem>
                      <SelectItem value="green">{t('colorGreen')}</SelectItem>
                      <SelectItem value="blue">{t('colorBlue')}</SelectItem>
                      <SelectItem value="yellow">{t('colorYellow')}</SelectItem>
                      <SelectItem value="red">{t('colorRed')}</SelectItem>
                      <SelectItem value="orange">{t('colorOrange')}</SelectItem>
                      <SelectItem value="pink">{t('colorPink')}</SelectItem>
                      <SelectItem value="cyan">Cyan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('type')}</label>
                  <Select value={badgeType} onValueChange={(v: any) => setBadgeType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">{t('typePositive')}</SelectItem>
                      <SelectItem value="negative">{t('typeNegative')}</SelectItem>
                      <SelectItem value="neutral">{t('typeNeutral')}</SelectItem>
                      <SelectItem value="special">{t('typeSpecial')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('whoCanAssign')}</label>
                <Select value={badgePermission} onValueChange={(v: any) => setBadgePermission(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mod">{t('anyMod')}</SelectItem>
                    <SelectItem value="super_mod">{t('superModOrAdmin')}</SelectItem>
                    <SelectItem value="admin">{t('adminOnly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingBadge(null)}>{t('cancel')}</Button>
              <Button onClick={handleUpdateBadge}>{t('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Footer />
    </div>
  );
}
