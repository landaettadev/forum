import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { NotFoundContent } from '@/components/not-found-content';

export const metadata = {
  title: '404 - TransForo',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <NotFoundContent />
      <Footer />
    </div>
  );
}
