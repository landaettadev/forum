import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PrivacyContent } from '@/components/pages/privacy-content';

export const metadata = {
  title: 'Privacy - TransForo',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <PrivacyContent />
      <Footer />
    </div>
  );
}
