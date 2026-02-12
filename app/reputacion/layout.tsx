import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Reputation',
  description: `Reputation rankings and leaderboard on ${SITE_NAME}. See the most trusted and active members.`,
  url: '/reputacion',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
