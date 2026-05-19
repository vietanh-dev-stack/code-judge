import ClassTabs from '@/components/dashboard/class-detail/class-tabs';
import { getClassroomDetail } from '@/services/classroom.apis';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ClassDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    await getClassroomDetail(id, {
      headers: { Cookie: cookieHeader },
    });
  } catch (error) {
    // If not enrolled or class doesn't exist, redirect to main dashboard
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-200 bg-white -mx-6 -mt-6 mb-6 px-6">
        <ClassTabs classId={id} />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
