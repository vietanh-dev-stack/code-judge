import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getClassroomDetail } from '@/services/classroom.apis';
import { getPublicCoreUrl } from '@/lib/public-config';
import { BellRing, Copy } from 'lucide-react';
import { AssignmentPost } from '@/components/dashboard/class-detail/assignment-post';
import Link from 'next/link';
import Image from 'next/image';
import { getClassroomBannerColor } from '@/lib/classroom-banner';
import { Contest, contestsApi } from '@/services/contest.apis';
import { authApi } from '@/services/auth.apis';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Class Stream | CodeJudge',
  description: 'View class announcements and stream',
};

export default async function ClassStreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const BASE_URL = getPublicCoreUrl();
  const bannerBg = getClassroomBannerColor(id);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let classroom;
  let contests: Contest[] = [];
  let user;

  try {
    const [classroomRes, contestsRes, userRes] = await Promise.all([
      getClassroomDetail(id, { headers: { Cookie: cookieHeader } }),
      contestsApi.findAll({ limit: 10, classRoomId: id }, { headers: { Cookie: cookieHeader } }),
      authApi.me({ headers: { Cookie: cookieHeader } }).catch(() => null),
    ]);
    classroom = classroomRes;
    contests = contestsRes.items;
    console.log(contests);
    user = userRes;
  } catch (error: any) {
    // If not in class or class not found, redirect to dashboard
    if (error.status === 403 || error.status === 404) {
      redirect('/dashboard');
    }
    throw error;
  }

  const sortedAssignments = [...(classroom.assignments || [])].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const incomingContests = contests.filter((c) => new Date(c.endAt) > new Date());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div
        className={`h-48 md:h-64 rounded-xl ${bannerBg} flex flex-col justify-end p-6 text-white relative overflow-hidden shadow-md`}
      >
        {/* Decorative elements for the banner (abstract shapes) */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute left-1/4 bottom-0 w-32 h-32 bg-white opacity-5 rounded-full translate-y-1/2"></div>

        <h1 className="text-3xl md:text-4xl font-semibold z-10">{classroom.name}</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column (Upcoming) */}
        <div className="w-full lg:w-56 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
            <h2 className="font-semibold text-gray-900 mb-2">Class code</h2>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{classroom.classCode}</p>
              <Button className="cursor-pointer" variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-2">Incoming Test</h2>
            {incomingContests.length === 0 ? (
              <p className="text-sm text-gray-500 mb-4">Great, there are no incoming test!</p>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                You have {incomingContests.length} incoming test{incomingContests.length > 1 ? 's' : ''}.
              </p>
            )}

            <div className="flex justify-end">
              <Button
                variant="link"
                className="p-0 h-auto text-black font-semibold hover:no-underline hover:text-gray-700 cursor-pointer"
                asChild
              >
                <Link href={`/dashboard/${id}/contests`}>View all contest</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column (Feed) */}
        <div className="flex-1 w-full space-y-4">
          {/* Announce something to your class box */}
          {classroom.ownerId === user?.id && (
            <Link
              href={`/dashboard/${id}/contests`}
              className="cursor-pointer bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold flex-shrink-0">
                <Image
                  src={classroom.owner.image || '/default-avatar.png'}
                  alt={classroom.owner.name}
                  width={40}
                  height={40}
                  className="rounded-full border-0 border-white"
                />
              </div>
              <p className="text-gray-500 text-sm">Create contest for your class.</p>
            </Link>
          )}

          {/* Posts List */}
          <div className="space-y-4">
            {sortedAssignments.length > 0 ? (
              sortedAssignments.map((assignment) => (
                <AssignmentPost key={assignment.id} assignment={assignment} classId={id} />
              ))
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-10 text-center space-y-3">
                <p className="text-gray-500 font-medium">No posts yet.</p>
                <p className="text-sm text-gray-400">
                  When the teacher creates an assignment or contest, it will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
