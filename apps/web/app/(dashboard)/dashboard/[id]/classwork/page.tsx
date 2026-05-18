import { Metadata } from 'next';
import { getPublicCoreUrl } from '@/lib/public-config';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClassworkList from '@/components/dashboard/class-detail/ClassworkList';
import { Problem, problemsApi } from '@/services/problem.apis';
import { getClassroomDetail } from '@/services/classroom.apis';
import { authApi } from '@/services/auth.apis';

export const metadata: Metadata = {
  title: 'Classwork | CodeJudge',
  description: 'View class assignments',
};

export default async function ClassworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let problemsResult;
  let classroom;
  let user;

  try {
    const results = await Promise.all([
      problemsApi.findAll(
        {
          limit: 50,
          classRoomId: id,
        },
        {
          headers: {
            Cookie: cookieHeader,
          },
        },
      ),
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
    problemsResult = results[0];
    classroom = results[1];
    user = results[2];
  } catch (error: any) {
    if (error.status === 403 || error.status === 404) {
      redirect('/dashboard');
    }
    throw error;
  }

  const initialProblems = problemsResult.items as Problem[];
  const isOwner = classroom.ownerId === user.id;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <ClassworkList classId={id} initialProblems={initialProblems} isOwner={isOwner} />
    </div>
  );
}
