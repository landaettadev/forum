import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Messages',
  description: 'Your private messages.',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
