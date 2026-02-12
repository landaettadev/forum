import { generateMetadata as genMeta, SITE_NAME } from '@/lib/metadata';

export const metadata = genMeta({
  title: 'Contact',
  description: `Contact the ${SITE_NAME} team. Report issues, suggest improvements or ask questions.`,
  url: '/contacto',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
