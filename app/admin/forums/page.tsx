'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Globe, MapPin, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
}

interface Forum {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  threads_count: number;
  posts_count: number;
}

interface Continent {
  id: string;
  name: string;
  slug: string;
}

interface Country {
  id: string;
  continent_id: string;
  name: string;
  flag_emoji: string;
}

export default function AdminForumsPage() {
  const { user: _user, profile } = useAuth();
  const t = useTranslations('adminForums');
  const [categories, setCategories] = useState<Category[]>([]);
  const [forums, setForums] = useState<Forum[]>([]);
  const [continents, setContinents] = useState<Continent[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [forumDialogOpen, setForumDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '', display_order: 0 });
  const [forumForm, setForumForm] = useState({ 
    name: '', slug: '', description: '', category_id: '', display_order: 0 
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      redirect('/');
    }
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    const [categoriesRes, forumsRes, continentsRes, countriesRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('forums').select('*').order('display_order'),
      supabase.from('continents').select('*').order('display_order'),
      supabase.from('countries').select('*').order('display_order'),
    ]);

    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (forumsRes.data) setForums(forumsRes.data);
    if (continentsRes.data) setContinents(continentsRes.data);
    if (countriesRes.data) setCountries(countriesRes.data);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSaveCategory = async () => {
    setIsLoading(true);
    const slug = categoryForm.slug || generateSlug(categoryForm.name);

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update({ ...categoryForm, slug })
        .eq('id', editingCategory.id);

      if (error) {
        toast.error(t('errorUpdatingCategory'));
      } else {
        toast.success(t('categoryUpdated'));
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert({ ...categoryForm, slug });

      if (error) {
        toast.error(t('errorCreatingCategory'));
      } else {
        toast.success(t('categoryCreated'));
      }
    }

    setIsLoading(false);
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', slug: '', description: '', display_order: 0 });
    fetchData();
  };

  const handleSaveForum = async () => {
    setIsLoading(true);
    const slug = forumForm.slug || generateSlug(forumForm.name);

    if (editingForum) {
      const { error } = await supabase
        .from('forums')
        .update({ ...forumForm, slug })
        .eq('id', editingForum.id);

      if (error) {
        toast.error(t('errorUpdatingForum'));
      } else {
        toast.success(t('forumUpdated'));
      }
    } else {
      const { error } = await supabase
        .from('forums')
        .insert({ ...forumForm, slug });

      if (error) {
        toast.error(t('errorCreatingForum'));
      } else {
        toast.success(t('forumCreated'));
      }
    }

    setIsLoading(false);
    setForumDialogOpen(false);
    setEditingForum(null);
    setForumForm({ name: '', slug: '', description: '', category_id: '', display_order: 0 });
    fetchData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(t('confirmDeleteCategory'))) return;

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error(t('errorDeletingCategory'));
    } else {
      toast.success(t('categoryDeleted'));
      fetchData();
    }
  };

  const handleDeleteForum = async (id: string) => {
    if (!confirm(t('confirmDeleteForum'))) return;

    const { error } = await supabase.from('forums').delete().eq('id', id);
    if (error) {
      toast.error(t('errorDeletingForum'));
    } else {
      toast.success(t('forumDeleted'));
      fetchData();
    }
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      display_order: category.display_order
    });
    setCategoryDialogOpen(true);
  };

  const openEditForum = (forum: Forum) => {
    setEditingForum(forum);
    setForumForm({
      name: forum.name,
      slug: forum.slug,
      description: forum.description,
      category_id: forum.category_id,
      display_order: forum.display_order
    });
    setForumDialogOpen(true);
  };

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
            <p className="forum-text-secondary">{t('description')}</p>
          </div>
          <Link href="/admin">
            <Button variant="outline">{t('backToPanel')}</Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {t('categories')}
              </CardTitle>
              <Button size="sm" onClick={() => setCategoryDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('new')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded bg-[hsl(var(--forum-surface-alt))]"
                  >
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs forum-text-muted">{category.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center forum-text-muted py-4">{t('noCategories')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('forums')}
              </CardTitle>
              <Button size="sm" onClick={() => setForumDialogOpen(true)} disabled={categories.length === 0}>
                <Plus className="h-4 w-4 mr-1" />
                {t('new')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {forums.map((forum) => {
                  const category = categories.find(c => c.id === forum.category_id);
                  return (
                    <div
                      key={forum.id}
                      className="flex items-center justify-between p-3 rounded bg-[hsl(var(--forum-surface-alt))]"
                    >
                      <div>
                        <p className="font-medium">{forum.name}</p>
                        <p className="text-xs forum-text-muted">
                          {category?.name} • {forum.threads_count} {t('threads')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditForum(forum)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteForum(forum.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {forums.length === 0 && (
                  <p className="text-center forum-text-muted py-4">{t('noForums')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="forum-surface border-[hsl(var(--forum-border))] mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('geoRegions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {continents.map((continent) => (
                <div key={continent.id} className="p-4 rounded bg-[hsl(var(--forum-surface-alt))]">
                  <h3 className="font-semibold mb-2">{continent.name}</h3>
                  <div className="space-y-1">
                    {countries
                      .filter(c => c.continent_id === continent.id)
                      .slice(0, 5)
                      .map((country) => (
                        <p key={country.id} className="text-sm forum-text-muted">
                          {country.flag_emoji} {country.name}
                        </p>
                      ))}
                    {countries.filter(c => c.continent_id === continent.id).length > 5 && (
                      <p className="text-xs forum-text-muted">
                        +{countries.filter(c => c.continent_id === continent.id).length - 5} {t('more')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? t('editCategory') : t('newCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder={t('autoGenerated')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('descriptionLabel')}</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('order')}</Label>
              <Input
                type="number"
                value={categoryForm.display_order}
                onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveCategory} disabled={isLoading || !categoryForm.name}>
              {isLoading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={forumDialogOpen} onOpenChange={setForumDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingForum ? t('editForum') : t('newForum')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('category')}</Label>
              <Select
                value={forumForm.category_id}
                onValueChange={(value: string) => setForumForm({ ...forumForm, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input
                value={forumForm.name}
                onChange={(e) => setForumForm({ ...forumForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={forumForm.slug}
                onChange={(e) => setForumForm({ ...forumForm, slug: e.target.value })}
                placeholder={t('autoGenerated')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('descriptionLabel')}</Label>
              <Textarea
                value={forumForm.description}
                onChange={(e) => setForumForm({ ...forumForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('order')}</Label>
              <Input
                type="number"
                value={forumForm.display_order}
                onChange={(e) => setForumForm({ ...forumForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForumDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveForum} disabled={isLoading || !forumForm.name || !forumForm.category_id}>
              {isLoading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
