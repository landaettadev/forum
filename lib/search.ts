/**
 * Sistema de búsqueda avanzada para TS Rating
 * Soporta búsqueda en hilos, posts y usuarios con filtros
 */

import { supabase } from './supabase';
import { escapeLikePattern } from './sanitize';

// Row shapes returned by Supabase select queries
interface ThreadRow {
  id: string;
  title: string;
  created_at: string;
  views_count: number;
  replies_count: number;
  is_pinned: boolean;
  is_hot: boolean;
  author: { id: string; username: string; avatar_url: string | null } | null;
  forum: { id: string; name: string; slug: string } | null;
}

interface PostRow {
  id: string;
  content: string;
  created_at: string;
  thread_id: string;
  author: { id: string; username: string; avatar_url: string | null } | null;
  thread: { id: string; title: string; forum: { name: string } | null } | null;
}

interface UserRow {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  posts_count: number;
  created_at: string;
  role: string;
  is_verified: boolean;
}

export type SearchType = 'all' | 'threads' | 'posts' | 'users';

export interface SearchFilters {
  query: string;
  type?: SearchType;
  forumId?: string;
  authorId?: string;
  dateFrom?: string;
  dateTo?: string;
  isNsfw?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  type: 'thread' | 'post' | 'user';
  id: string;
  title?: string;
  content?: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  relevance?: number;
  highlight?: string;
  thread_id?: string;
  forum_name?: string;
  author?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

const RESULTS_PER_PAGE = 20;

/**
 * Búsqueda en hilos
 */
export async function searchThreads(
  query: string,
  filters: Partial<SearchFilters> = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const page = filters.page || 1;
  const limit = filters.limit || RESULTS_PER_PAGE;
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from('threads')
    .select(`
      id,
      title,
      created_at,
      views_count,
      replies_count,
      is_pinned,
      is_hot,
      author:profiles!threads_author_id_fkey (
        id,
        username,
        avatar_url
      ),
      forum:forums!threads_forum_id_fkey (
        id,
        name,
        slug
      )
    `, { count: 'exact' })
    .ilike('title', `%${escapeLikePattern(query)}%`)
    .order('created_at', { ascending: false });

  // Aplicar filtros
  if (filters.forumId) {
    queryBuilder = queryBuilder.eq('forum_id', filters.forumId);
  }

  if (filters.authorId) {
    queryBuilder = queryBuilder.eq('author_id', filters.authorId);
  }

  if (filters.dateFrom) {
    queryBuilder = queryBuilder.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    queryBuilder = queryBuilder.lte('created_at', filters.dateTo);
  }

  // Paginación
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error('Error searching threads:', error);
    return { results: [], total: 0 };
  }

  const results: SearchResult[] = ((data as unknown as ThreadRow[]) || []).map((thread) => ({
    type: 'thread' as const,
    id: thread.id,
    title: thread.title,
    created_at: thread.created_at,
    thread_id: thread.id,
    forum_name: thread.forum?.name,
    author: {
      id: thread.author?.id ?? '',
      username: thread.author?.username ?? '',
      avatar_url: thread.author?.avatar_url ?? undefined,
    },
    highlight: highlightMatch(thread.title, query),
  }));

  return { results, total: count || 0 };
}

/**
 * Búsqueda en posts
 */
export async function searchPosts(
  query: string,
  filters: Partial<SearchFilters> = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const page = filters.page || 1;
  const limit = filters.limit || RESULTS_PER_PAGE;
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      thread_id,
      author:profiles!posts_author_id_fkey (
        id,
        username,
        avatar_url
      ),
      thread:threads!posts_thread_id_fkey (
        id,
        title,
        forum:forums!threads_forum_id_fkey (
          name
        )
      )
    `, { count: 'exact' })
    .ilike('content', `%${escapeLikePattern(query)}%`)
    .order('created_at', { ascending: false });

  // Aplicar filtros
  if (filters.authorId) {
    queryBuilder = queryBuilder.eq('author_id', filters.authorId);
  }

  if (filters.dateFrom) {
    queryBuilder = queryBuilder.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    queryBuilder = queryBuilder.lte('created_at', filters.dateTo);
  }

  // Paginación
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error('Error searching posts:', error);
    return { results: [], total: 0 };
  }

  const results: SearchResult[] = ((data as unknown as PostRow[]) || []).map((post) => ({
    type: 'post' as const,
    id: post.id,
    content: truncateContent(post.content, 200),
    created_at: post.created_at,
    thread_id: post.thread_id,
    title: post.thread?.title,
    forum_name: post.thread?.forum?.name,
    author: {
      id: post.author?.id ?? '',
      username: post.author?.username ?? '',
      avatar_url: post.author?.avatar_url ?? undefined,
    },
    highlight: highlightMatch(truncateContent(post.content, 200), query),
  }));

  return { results, total: count || 0 };
}

/**
 * Búsqueda de usuarios
 */
export async function searchUsers(
  query: string,
  filters: Partial<SearchFilters> = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const page = filters.page || 1;
  const limit = filters.limit || RESULTS_PER_PAGE;
  const offset = (page - 1) * limit;

  let queryBuilder = supabase
    .from('profiles')
    .select(`
      id,
      username,
      avatar_url,
      bio,
      posts_count,
      created_at,
      role,
      is_verified
    `, { count: 'exact' })
    .ilike('username', `%${escapeLikePattern(query)}%`)
    .eq('is_deleted', false)
    .order('posts_count', { ascending: false });

  // Paginación
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error('Error searching users:', error);
    return { results: [], total: 0 };
  }

  const results: SearchResult[] = ((data as unknown as UserRow[]) || []).map((user) => ({
    type: 'user' as const,
    id: user.id,
    username: user.username,
    avatar_url: user.avatar_url ?? undefined,
    content: user.bio || '',
    created_at: user.created_at,
    highlight: highlightMatch(user.username, query),
  }));

  return { results, total: count || 0 };
}

/**
 * Búsqueda unificada en todos los tipos
 */
export async function searchAll(
  query: string,
  filters: Partial<SearchFilters> = {}
): Promise<{
  threads: { results: SearchResult[]; total: number };
  posts: { results: SearchResult[]; total: number };
  users: { results: SearchResult[]; total: number };
}> {
  // Ejecutar búsquedas en paralelo
  const [threads, posts, users] = await Promise.all([
    searchThreads(query, { ...filters, limit: 5 }),
    searchPosts(query, { ...filters, limit: 5 }),
    searchUsers(query, { ...filters, limit: 5 }),
  ]);

  return { threads, posts, users };
}

/**
 * Búsqueda principal que delega según el tipo
 */
export async function search(
  query: string,
  filters: Partial<SearchFilters> = {}
): Promise<{ results: SearchResult[]; total: number; type: SearchType }> {
  const type = filters.type || 'all';

  switch (type) {
    case 'threads':
      const threadsResult = await searchThreads(query, filters);
      return { ...threadsResult, type: 'threads' };

    case 'posts':
      const postsResult = await searchPosts(query, filters);
      return { ...postsResult, type: 'posts' };

    case 'users':
      const usersResult = await searchUsers(query, filters);
      return { ...usersResult, type: 'users' };

    case 'all':
      const allResults = await searchAll(query, filters);
      // Combinar primeros resultados de cada tipo
      const combined: SearchResult[] = [
        ...allResults.threads.results.slice(0, 3),
        ...allResults.posts.results.slice(0, 3),
        ...allResults.users.results.slice(0, 3),
      ];
      const total =
        allResults.threads.total +
        allResults.posts.total +
        allResults.users.total;
      return { results: combined, total, type: 'all' };

    default:
      return { results: [], total: 0, type: 'all' };
  }
}

/**
 * Búsqueda avanzada con full-text search (requiere extensión pg_trgm en Postgres)
 */
export async function advancedSearch(
  query: string,
  filters: Partial<SearchFilters> = {}
): Promise<{ results: SearchResult[]; total: number }> {
  // Esta función requiere configuración adicional en Supabase
  // Por ahora, delega a la búsqueda básica
  return search(query, filters);
}

/**
 * Resaltar coincidencias en el texto.
 * Escapes HTML first to prevent XSS, then wraps matches in <mark>.
 */
function highlightMatch(text: string, query: string): string {
  if (!text || !query) return text;

  // Escape HTML entities first to prevent injection
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return safe.replace(regex, '<mark>$1</mark>');
}

/**
 * Truncar contenido para preview
 */
function truncateContent(content: string, maxLength: number): string {
  if (!content) return '';
  
  // Remover HTML
  const text = content.replace(/<[^>]*>/g, '');
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Obtener sugerencias de búsqueda (autocompletado)
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  if (query.length < 2) return [];

  const { data, error } = await supabase
    .from('threads')
    .select('title')
    .ilike('title', `%${escapeLikePattern(query)}%`)
    .limit(limit);

  if (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }

  return (data || []).map((thread: { title: string }) => thread.title);
}

/**
 * Guardar búsqueda en historial (opcional)
 */
export async function saveSearchHistory(
  userId: string,
  query: string
): Promise<void> {
  try {
    await supabase.from('search_history').insert({
      user_id: userId,
      query,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving search history:', error);
  }
}

/**
 * Obtener búsquedas populares
 */
export async function getPopularSearches(limit: number = 10): Promise<string[]> {
  try {
    // Use SQL-side aggregation via RPC to avoid downloading all rows
    const { data, error } = await supabase.rpc('get_popular_searches', {
      p_days: 7,
      p_limit: limit,
    });

    if (error) throw error;

    return (data || []).map((row: { query: string; search_count: number }) => row.query);
  } catch (error) {
    console.error('Error getting popular searches:', error);
    return [];
  }
}
