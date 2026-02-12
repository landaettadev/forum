import { generateMetadata as genMeta } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Reset Password',
  description: 'Reset your account password.',
  noIndex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
