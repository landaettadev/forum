import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PrivacyContent } from '@/components/pages/privacy-content';
import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Privacy Policy',
  description: 'Privacy policy and data protection information for TransForo.',
  url: '/privacidad',
  noIndex: true,
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <PrivacyContent />
      <Footer />
    </div>
  );
}
