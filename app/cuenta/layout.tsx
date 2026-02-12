import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'My Account',
  description: 'Account area.',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
