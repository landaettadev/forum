import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Login',
  description: `Sign in to your ${SITE_NAME} account. Access forums, messages and community features.`,
  url: '/login',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
