import { redirect } from 'next/navigation';

type PageProps = {
  params: { username: string };
};

// Redirect old /usuaria/ URLs to /user/
export default function UsuariaRedirect({ params }: PageProps) {
  redirect(`/user/${params.username}`);
}
