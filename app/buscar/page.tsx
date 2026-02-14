'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { escapeLikePattern } from '@/lib/sanitize';
import { Search, MessageSquare, User, FileText, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

type SearchType = 'all' | 'threads' | 'posts' | 'users';

type ThreadResult = {
  id: string;
  title: string;
  created_at: string;
  author: { username: string; is_verified: boolean };
  forum: { name: string; slug: string };
  replies_count: number;
};

type PostResult = {
  id: string;
  content: string;
  created_at: string;
  author: { username: string; is_verified: boolean };
  thread: { id: string; title: string };
};

type UserResult = {
  id: string;
  username: string;
  is_verified: boolean;
  role: string;
  posts_count: number;
  created_at: string;
};

export default function BuscarPage() {
  const locale = useLocale();
  const t = useTranslations('search');
  const dateLocale = getDateFnsLocale(locale);
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [threadResults, setThreadResults] = useState<ThreadResult[]>([]);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);

  const executeSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) return;
    setLoading(true);
    setSearched(true);

    try {
      const searchPattern = `%${escapeLikePattern(searchQuery.trim())}%`;

      if (searchType === 'all' || searchType === 'threads') {
        const { data: threads } = await supabase
          .from('threads')
          .select('id, title, created_at, replies_count, author:profiles!threads_author_id_fkey(username, is_verified), forum:forums!threads_forum_id_fkey(name, slug)')
          .ilike('title', searchPattern)
          .order('created_at', { ascending: false })
          .limit(20);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setThreadResults((threads || []) as any);
      }

      if (searchType === 'all' || searchType === 'posts') {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, created_at, author:profiles!posts_author_id_fkey(username, is_verified), thread:threads!posts_thread_id_fkey(id, title)')
          .ilike('content', searchPattern)
          .order('created_at', { ascending: false })
          .limit(20);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPostResults((posts || []) as any);
      }

      if (searchType === 'all' || searchType === 'users') {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username, is_verified, role, posts_count, created_at')
          .ilike('username', searchPattern)
          .order('posts_count', { ascending: false })
          .limit(20);

        setUserResults(users as UserResult[] || []);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, [searchType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  // Auto-search when navigated with ?q= parameter
  useEffect(() => {
    const q = searchParams?.get('q');
    if (q && q.trim().length >= 2) {
      setQuery(q);
      executeSearch(q);
    }
  }, [searchParams, executeSearch]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ?
        <mark key={i} className="bg-[hsl(var(--forum-accent))] bg-opacity-30 text-[hsl(var(--forum-accent))]">{part}</mark> :
        part
    );
  };

  const totalResults = threadResults.length + postResults.length + userResults.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs items={[{ label: t('button') }]} />

        <div className="flex gap-6">
          <main className="flex-1">
            <div className="forum-surface p-6 mb-6">
              <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>

              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 forum-text-muted" />
                    <Input
                      type="search"
                      placeholder={t('placeholder')}
                      className="pl-10"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      <SelectItem value="threads">{t('threads')}</SelectItem>
                      <SelectItem value="posts">{t('posts')}</SelectItem>
                      <SelectItem value="users">{t('users')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    disabled={loading || query.trim().length < 2}
                    className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('searching')}
                      </>
                    ) : (
                      t('button')
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {!searched ? (
              <div className="forum-surface p-12 text-center forum-text-muted">
                <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>{t('enterTerm')}</p>
              </div>
            ) : loading ? (
              <div className="forum-surface p-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin forum-text-muted" />
                <p className="forum-text-muted">{t('searching')}</p>
              </div>
            ) : totalResults === 0 ? (
              <div className="forum-surface p-12 text-center forum-text-muted">
                <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">{t('noResults')}</p>
                <p className="text-sm">{t('tryOther')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {searched && (
                  <div className="forum-surface p-4">
                    <p className="forum-text-secondary">
                      {t('resultsFor', { count: totalResults, query })}
                    </p>
                  </div>
                )}

                {threadResults.length > 0 && (searchType === 'all' || searchType === 'threads') && (
                  <div className="forum-surface p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {t('threads')} ({threadResults.length})
                    </h2>
                    <div className="space-y-3">
                      {threadResults.map((thread) => (
                        <div key={thread.id} className="border-b border-[hsl(var(--forum-border))] last:border-0 pb-3 last:pb-0">
                          <Link
                            href={`/hilo/${thread.id}`}
                            className="text-lg font-semibold hover:text-[hsl(var(--forum-accent))] transition-colors"
                          >
                            {highlightText(thread.title, query)}
                          </Link>
                          <div className="flex items-center gap-3 mt-2 text-sm forum-text-secondary">
                            <span>
                              {t('by')} <Link href={`/user/${thread.author.username}`} className="hover:text-[hsl(var(--forum-accent))]">
                                {thread.author.username}
                              </Link>
                              {thread.author.is_verified && (
                                <span className="badge-verified ml-1">✓</span>
                              )}
                            </span>
                            <span>•</span>
                            <span>
                              {t('inForum')} <Link href={`/foro/${thread.forum.slug}`} className="hover:text-[hsl(var(--forum-accent))]">
                                {thread.forum.name}
                              </Link>
                            </span>
                            <span>•</span>
                            <span>{thread.replies_count} {t('replies')}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true, locale: dateLocale })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {postResults.length > 0 && (searchType === 'all' || searchType === 'posts') && (
                  <div className="forum-surface p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {t('posts')} ({postResults.length})
                    </h2>
                    <div className="space-y-4">
                      {postResults.map((post) => (
                        <div key={post.id} className="border-b border-[hsl(var(--forum-border))] last:border-0 pb-4 last:pb-0">
                          <Link
                            href={`/hilo/${post.thread.id}#post-${post.id}`}
                            className="font-semibold hover:text-[hsl(var(--forum-accent))] transition-colors mb-2 block"
                          >
                            {post.thread.title}
                          </Link>
                          <div className="text-sm forum-text-secondary mb-2">
                            {highlightText(
                              post.content.length > 200
                                ? post.content.substring(0, 200) + '...'
                                : post.content,
                              query
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs forum-text-muted">
                            <span>
                              {t('by')} <Link href={`/user/${post.author.username}`} className="hover:text-[hsl(var(--forum-accent))]">
                                {post.author.username}
                              </Link>
                              {post.author.is_verified && (
                                <span className="badge-verified ml-1">✓</span>
                              )}
                            </span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: dateLocale })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userResults.length > 0 && (searchType === 'all' || searchType === 'users') && (
                  <div className="forum-surface p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t('users')} ({userResults.length})
                    </h2>
                    <div className="space-y-3">
                      {userResults.map((user) => (
                        <div key={user.id} className="flex items-center justify-between border-b border-[hsl(var(--forum-border))] last:border-0 pb-3 last:pb-0">
                          <div>
                            <Link
                              href={`/user/${user.username}`}
                              className="text-lg font-semibold hover:text-[hsl(var(--forum-accent))] transition-colors"
                            >
                              {highlightText(user.username, query)}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              {user.role === 'admin' && <Badge className="badge-admin">Admin</Badge>}
                              {user.role === 'moderator' && <Badge className="badge-mod">Mod</Badge>}
                              {user.is_verified && <Badge className="badge-verified">{t('verified')}</Badge>}
                            </div>
                          </div>
                          <div className="text-right text-sm forum-text-secondary">
                            <div className="font-semibold">{user.posts_count} {t('posts')}</div>
                            <div className="text-xs forum-text-muted">
                              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: dateLocale })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
