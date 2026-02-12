import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Classifieds',
  description: `Browse classifieds and ads on ${SITE_NAME}. Post and discover services, offers and more.`,
  url: '/anuncios',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
