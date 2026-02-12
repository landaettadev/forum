import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Alerts',
  description: 'Your alerts.',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
