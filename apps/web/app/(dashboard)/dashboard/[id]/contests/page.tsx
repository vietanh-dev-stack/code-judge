import { Metadata } from 'next';
import ClassContestsTab from '@/components/dashboard/class-detail/ClassContestsTab';
import { getClassroomDetail } from '@/services/classroom.apis';
import { authApi } from '@/services/auth.apis';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Manage Contests | CodeJudge',
  description: 'Create and manage contests for your class',
};

export default async function ClassContestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let classroom;
  let user;

  try {
    const results = await Promise.all([
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
    classroom = results[0];
    user = results[1];
  } catch (error: any) {
    if (error.status === 403 || error.status === 404) {
      redirect('/dashboard');
    }
    throw error;
  }

  const isOwner = classroom.ownerId === user.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ClassContestsTab classId={id} isOwner={isOwner} />
    </div>
  );
}
