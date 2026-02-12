import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { ForumsPageContent } from '@/components/forum/forums-page-content';
import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Forums',
  description: `Browse all forums and countries on ${SITE_NAME}. Find trans community discussions, reviews and ratings by region.`,
  url: '/foros',
});

export const revalidate = 60;

type ContinentWithCountries = {
  id: string;
  name: string;
  slug: string;
  name_es: string;
  display_order: number;
  countries: {
    id: string;
    name: string;
    slug: string;
    name_es: string;
    flag_emoji: string;
    capacity_level: string;
    display_order: number;
    regions: {
      id: string;
      name: string;
      slug: string;
    }[];
  }[];
};

export default async function ForumsPage() {
  const supabase = createServerSupabaseClient();
  const { data: continents } = await supabase
    .from('continents')
    .select('*')
    .order('display_order');

  const { data: countries } = await supabase
    .from('countries')
    .select('*')
    .order('display_order');

  const { data: regions } = await supabase
    .from('regions')
    .select('*')
    .order('display_order');

  const continentsWithData: ContinentWithCountries[] = (continents || []).map((continent: any) => ({
    ...continent,
    countries: (countries || [])
      .filter((c: any) => c.continent_id === continent.id)
      .map((country: any) => ({
        ...country,
        regions: (regions || []).filter((r: any) => r.country_id === country.id)
      }))
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex gap-6">
          <ForumsPageContent continentsWithData={continentsWithData} />

          <div className="hidden lg:block w-80">
            <Sidebar />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
