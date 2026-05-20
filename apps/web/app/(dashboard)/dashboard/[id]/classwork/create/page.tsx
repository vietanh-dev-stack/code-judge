import { Suspense } from 'react';
import { Metadata } from 'next';
import ClassProblemCreate from '@/components/dashboard/class-detail/ClassProblemCreate';
import { getClassroomDetail } from '@/services/classroom.apis';
import { authApi } from '@/services/auth.apis';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Create Problem | CodeJudge',
  description: 'Design a new programming problem for your class',
};

export default async function CreateProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [classroom, user] = await Promise.all([
    getClassroomDetail(id, {
      headers: {
        Cookie: cookieHeader,
      },
    }),
    authApi.me({
      headers: {
        Cookie: cookieHeader,
      },
    }),
  ]);

  if (classroom.ownerId !== user.id) {
    redirect(`/dashboard/${id}/classwork`);
  }

  if (classroom.isActive === false) {
    redirect(`/dashboard/${id}/classwork`);
  }

  return (
    <div className="py-8">
      <Suspense fallback={<div className="h-32 animate-pulse rounded-md bg-muted" />}>
        <ClassProblemCreate classId={id} />
      </Suspense>
    </div>
  );
}
