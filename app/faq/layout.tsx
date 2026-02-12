import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'FAQ',
  description: `Frequently asked questions about ${SITE_NAME}. Learn how the forum works, account management, and community guidelines.`,
  url: '/faq',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
