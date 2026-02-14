import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CookiesContent } from '@/components/pages/cookies-content';
import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Cookies Policy',
  description: 'Cookie policy and tracking information for TS Rating.',
  url: '/cookies',
  noIndex: true,
});

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CookiesContent />
      <Footer />
    </div>
  );
}
