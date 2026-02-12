import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Admin Panel',
  description: 'Administration panel.',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
