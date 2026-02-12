import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Search',
  description: `Search threads, posts and users on ${SITE_NAME}. Find trans community discussions and profiles.`,
  url: '/buscar',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
