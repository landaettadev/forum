import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { UserProfilePageContent } from '@/components/profile/user-profile-page-content';
import { generateProfileMetadata } from '@/lib/metadata';
import { profileJsonLd as _profileJsonLd } from '@/lib/jsonld';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, bio, avatar_url, posts_count')
    .eq('username', params.username)
    .maybeSingle();

  if (!profile) return { title: 'Profile not found' };

  return generateProfileMetadata({
    username: profile.username,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    posts_count: profile.posts_count,
  });
}

type PageProps = {
  params: { username: string };
  searchParams: { threadsPage?: string; postsPage?: string };
};

export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const threadsPage = Math.max(1, parseInt(searchParams.threadsPage || '1', 10));
  const postsPage = Math.max(1, parseInt(searchParams.postsPage || '1', 10));
  const pageSize = 10;

  const supabase = createServerSupabaseClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: threads, count: threadsCount } = await supabase
    .from('threads')
    .select('*, forum:forums(name, slug)', { count: 'exact' })
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })
    .range((threadsPage - 1) * pageSize, threadsPage * pageSize - 1);

  const { data: recentPosts, count: postsCount } = await supabase
    .from('posts')
    .select('*, thread:threads(id, title)', { count: 'exact' })
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })
    .range((postsPage - 1) * pageSize, postsPage * pageSize - 1);

  const { count: followersCount } = await supabase
    .from('user_followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id);

  const { count: followingCount } = await supabase
    .from('user_followers')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile.id);

  const breadcrumbItems = [
    { label: 'Users', href: '#' },
    { label: profile.username },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="flex gap-6">
          <main className="flex-1">
            <UserProfilePageContent
              profile={profile}
              threads={threads || []}
              recentPosts={recentPosts || []}
              threadsCount={threadsCount || 0}
              postsCount={postsCount || 0}
              followersCount={followersCount || 0}
              followingCount={followingCount || 0}
              threadsPage={threadsPage}
              postsPage={postsPage}
              pageSize={pageSize}
            />
          </main>

          <div className="hidden lg:block w-80">
            <Sidebar />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
