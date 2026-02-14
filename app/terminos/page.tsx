import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { TermsContent } from '@/components/pages/terms-content';
import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Terms of Service',
  description: 'Terms of service and conditions of use for TS Rating.',
  url: '/terminos',
  noIndex: true,
});

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <TermsContent />
      <Footer />
    </div>
  );
}
