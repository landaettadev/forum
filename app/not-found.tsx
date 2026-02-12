import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { NotFoundContent } from '@/components/not-found-content';
import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <NotFoundContent />
      <Footer />
    </div>
  );
}
