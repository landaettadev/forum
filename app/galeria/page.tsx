import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { GalleryContent } from '@/components/gallery/gallery-content';

export const revalidate = 60;

export default async function GalleryPage() {
  const supabase = createServerSupabaseClient();
  const { data: media } = await supabase
    .from('media_gallery')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex gap-6">
          <main className="flex-1">
            <GalleryContent media={media || []} />
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
