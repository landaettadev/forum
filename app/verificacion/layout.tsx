import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Verification',
  description: 'Account verification.',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
