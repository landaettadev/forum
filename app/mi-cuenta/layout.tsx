import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'My Account',
  description: 'Manage your account settings and profile.',
  url: '/mi-cuenta',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
