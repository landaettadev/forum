import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'New Thread',
  description: 'Create a new thread.',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
