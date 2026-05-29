import ClassTabs from '@/components/dashboard/class-detail/class-tabs';
import { ClassDetailProvider } from '@/components/dashboard/class-detail/class-detail-context';
import ArchivedClassBanner from '@/components/dashboard/class-detail/archived-class-banner';
import { getClassroomDetail } from '@/services/classroom.apis';
import { authApi } from '@/services/auth.apis';
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

  let classroom;
  let userId: string | null = null;
  let userRole: string | null = null;

  try {
    const [classroomRes, userRes] = await Promise.all([
      getClassroomDetail(id, {
        headers: { Cookie: cookieHeader },
      }),
      authApi.me({ headers: { Cookie: cookieHeader } }).catch(() => null),
    ]);
    classroom = classroomRes;
    userId = userRes?.id ?? null;
    userRole = userRes?.role ?? null;
  } catch {
    redirect('/dashboard');
  }

  const isActive = classroom.isActive !== false;
  const isOwner = classroom.ownerId === userId;
  const canManage = isOwner && isActive;
  const canExportReports = userRole === 'ADMIN' || (isOwner && isActive);

  return (
    <ClassDetailProvider
      value={{
        classId: id,
        className: classroom.name,
        isActive,
        isOwner,
        canManage,
        canExportReports,
      }}
    >
      <div className="flex flex-col">
        <div className="-mx-6 -mt-6 mb-6 border-b border-border bg-card px-6">
          <ClassTabs classId={id} />
        </div>
        <div className="flex-1 px-0">
          {!isActive && <ArchivedClassBanner />}
          {children}
        </div>
      </div>
    </ClassDetailProvider>
  );
}
