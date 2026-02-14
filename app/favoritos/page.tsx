'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { 
  Bookmark, MessageSquare, Trash2, Search, Folder, 
  ExternalLink, Clock, Eye, MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ThreadBookmark {
  id: string;
  folder_name: string;
  notes: string | null;
  bookmarked_at: string;
  thread_id: string;
  title: string;
  thread_created_at: string;
  replies_count: number;
  views_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  category_name: string;
  category_slug: string;
  author_username: string;
  author_avatar: string | null;
}

interface PostBookmark {
  id: string;
  folder_name: string;
  notes: string | null;
  created_at: string;
  post_id: string;
  post: {
    content: string;
    created_at: string;
    thread_id: string;
    thread: {
      title: string;
    };
    author: {
      username: string;
      avatar_url: string | null;
    };
  };
}

export default function FavoritosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('favoritesPage');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [threadBookmarks, setThreadBookmarks] = useState<ThreadBookmark[]>([]);
  const [postBookmarks, setPostBookmarks] = useState<PostBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch thread bookmarks
      const { data: threads, error: threadsError } = await supabase
        .from('user_thread_bookmarks_view')
        .select('*')
        .eq('user_id', user.id)
        .order('bookmarked_at', { ascending: false });

      if (threadsError) throw threadsError;

      // Fetch post bookmarks
      const { data: posts, error: postsError } = await supabase
        .from('post_bookmarks')
        .select(`
          *,
          post:posts (
            content,
            created_at,
            thread_id,
            thread:threads (title),
            author:profiles!posts_author_id_fkey (username, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setThreadBookmarks(threads || []);
      setPostBookmarks(posts || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchBookmarks();
    }
  }, [user, authLoading, router, fetchBookmarks]);

  const removeThreadBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('thread_bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;

      setThreadBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      toast.success(t('bookmarkRemoved'));
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error(t('removeError'));
    }
  };

  const removePostBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('post_bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;

      setPostBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      toast.success(t('bookmarkRemoved'));
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error(t('removeError'));
    }
  };

  // Get unique folders
  const threadFolders = Array.from(new Set(threadBookmarks.map(b => b.folder_name)));
  const postFolders = Array.from(new Set(postBookmarks.map(b => b.folder_name)));
  const allFolders = Array.from(new Set([...threadFolders, ...postFolders]));

  // Filter bookmarks
  const filteredThreadBookmarks = threadBookmarks.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.author_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || b.folder_name === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const filteredPostBookmarks = postBookmarks.filter(b => {
    const matchesSearch = b.post?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.post?.author?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || b.folder_name === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen forum-bg-primary">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--forum-accent))]" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen forum-bg-primary">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: t('breadcrumb') }
          ]}
        />

        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bookmark className="h-8 w-8 text-yellow-500" />
              <div>
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <p className="text-sm forum-text-secondary">
                  {t('itemsSaved', { count: threadBookmarks.length + postBookmarks.length })}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {allFolders.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedFolder === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFolder('all')}
                >
                  {t('allFolders')}
                </Button>
                {allFolders.map(folder => (
                  <Button
                    key={folder}
                    variant={selectedFolder === folder ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <Folder className="h-3 w-3 mr-1" />
                    {folder}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Tabs defaultValue="threads" className="space-y-6">
            <TabsList>
              <TabsTrigger value="threads" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('threads')} ({filteredThreadBookmarks.length})
              </TabsTrigger>
              <TabsTrigger value="posts" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                {t('posts')} ({filteredPostBookmarks.length})
              </TabsTrigger>
            </TabsList>

            {/* Thread Bookmarks */}
            <TabsContent value="threads">
              {filteredThreadBookmarks.length === 0 ? (
                <Card className="forum-bg-secondary border-[hsl(var(--forum-border))]">
                  <CardContent className="py-12 text-center">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('noThreads')}</h3>
                    <p className="text-sm forum-text-secondary">
                      {t('noThreadsDesc')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredThreadBookmarks.map((bookmark) => (
                    <Card key={bookmark.id} className="forum-bg-secondary border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))] transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={`/hilo/${bookmark.thread_id}`}
                              className="font-semibold hover:text-[hsl(var(--forum-accent))] transition-colors line-clamp-1"
                            >
                              {bookmark.title}
                            </Link>
                            <div className="flex items-center gap-3 mt-2 text-sm forum-text-secondary">
                              <span>{bookmark.author_username}</span>
                              <span>•</span>
                              <span>{bookmark.category_name}</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-3.5 w-3.5" />
                                {bookmark.replies_count}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {bookmark.views_count}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {t('saved')} {formatDistanceToNow(new Date(bookmark.bookmarked_at), { addSuffix: true, locale: dateLocale })}
                              {bookmark.folder_name !== 'General' && (
                                <>
                                  <span>•</span>
                                  <Folder className="h-3 w-3" />
                                  {bookmark.folder_name}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/hilo/${bookmark.thread_id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('removeBookmark')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('removeThreadDesc')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => removeThreadBookmark(bookmark.id)}>
                                    {t('remove')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Post Bookmarks */}
            <TabsContent value="posts">
              {filteredPostBookmarks.length === 0 ? (
                <Card className="forum-bg-secondary border-[hsl(var(--forum-border))]">
                  <CardContent className="py-12 text-center">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('noPosts')}</h3>
                    <p className="text-sm forum-text-secondary">
                      {t('noPostsDesc')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredPostBookmarks.map((bookmark) => (
                    <Card key={bookmark.id} className="forum-bg-secondary border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))] transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={`/hilo/${bookmark.post?.thread_id}#post-${bookmark.post_id}`}
                              className="text-sm font-medium text-[hsl(var(--forum-accent))] hover:underline"
                            >
                              {bookmark.post?.thread?.title}
                            </Link>
                            <p className="text-sm forum-text-secondary mt-2 line-clamp-2">
                              {bookmark.post?.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{bookmark.post?.author?.username}</span>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              {t('saved')} {formatDistanceToNow(new Date(bookmark.created_at), { addSuffix: true, locale: dateLocale })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/hilo/${bookmark.post?.thread_id}#post-${bookmark.post_id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('removeBookmark')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('removePostDesc')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => removePostBookmark(bookmark.id)}>
                                    {t('remove')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
