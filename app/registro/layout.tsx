import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Register',
  description: `Create your ${SITE_NAME} account. Join the trans community forum — discussions, reviews and connections.`,
  url: '/registro',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
