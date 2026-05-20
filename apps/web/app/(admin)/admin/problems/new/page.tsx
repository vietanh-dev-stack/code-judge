import { redirect } from 'next/navigation';

type PageProps = { searchParams: Promise<{ edit?: string }> };

/** Legacy URL: `/admin/problems/new` → `/admin/problems/create` */
export default async function AdminProblemsNewRedirect({ searchParams }: PageProps) {
  const sp = await searchParams;
  const edit = sp?.edit?.trim();
  if (edit) {
    redirect(`/admin/problems/create?edit=${encodeURIComponent(edit)}`);
  }
  redirect('/admin/problems/create');
}
