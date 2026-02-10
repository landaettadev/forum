import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { TermsContent } from '@/components/pages/terms-content';

export const metadata = {
  title: 'Terms - TransForo',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <TermsContent />
      <Footer />
    </div>
  );
}
