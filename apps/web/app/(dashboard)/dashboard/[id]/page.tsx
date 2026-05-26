import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Classroom, getClassroomDetail } from '@/services/classroom.apis';
import { Copy, Calendar, ArrowRight, ImageIcon, Paperclip } from 'lucide-react';
import { AssignmentPost } from '@/components/dashboard/class-detail/assignment-post';
import Link from 'next/link';
import Image from 'next/image';
import { getClassroomBannerColor } from '@/lib/classroom-banner';
import { Contest, contestsApi } from '@/services/contest.apis';
import { authApi } from '@/services/auth.apis';

export const metadata: Metadata = {
  title: 'Class Stream | CodeJudge',
  description: 'View class announcements and stream',
};

export default async function ClassStreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let classroom: Classroom;
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
    user = userRes;
  } catch (error: any) {
    if (error.status === 403 || error.status === 404) {
      redirect('/dashboard');
    }
    throw error;
  }

  const isOwner = classroom.ownerId === user?.id;
  const canManage = isOwner && classroom.isActive !== false;

  const sortedAssignments = [...(classroom.assignments || [])]
    .filter((assignment) => {
      if (!assignment.problem) return true;
      return isOwner || assignment.problem.visibility !== 'CONTEST_ONLY';
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const incomingContests = contests.filter((c) => new Date(c.endAt) > new Date());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden shadow-lg min-h-[160px] flex flex-col justify-between">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-primary/10 to-transparent rounded-full pointer-events-none -translate-y-1/3 translate-x-1/4" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-1 w-6 bg-primary rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">In Session</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{classroom.name}</h1>
          <p className="text-sm text-muted-foreground font-medium">
            {classroom.description || `Prof. ${classroom.owner?.name || 'Instructor'} • Computer Science Department`}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column (Class Access & Timeline) */}
        <div className="w-full lg:w-56 flex-shrink-0 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-md space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class Access</h2>
            <div className="flex items-center justify-between bg-muted/30 border border-border/80 rounded-lg px-3.5 py-2.5">
              <p className="font-mono text-sm font-bold text-primary tracking-wider">{classroom.classCode}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Timeline</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted/20 border border-border flex items-center justify-center text-muted-foreground/60">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[150px] mx-auto font-medium">
                {incomingContests.length === 0
                  ? 'No upcoming tests for the next 7 days.'
                  : `You have ${incomingContests.length} upcoming test${incomingContests.length > 1 ? 's' : ''}.`}
              </p>
            </div>
            <div className="border-t border-border/40 pt-3 flex justify-center">
              <Link
                href={`/dashboard/${id}/contests`}
                className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
              >
                View Schedule <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (Feed) */}
        <div className="flex-1 w-full space-y-4">
          {/* Announce sharing box */}
          {canManage && (
            <Link
              href={`/dashboard/${id}/contests`}
              className="cursor-pointer bg-card border border-border rounded-xl p-4 shadow-md flex items-center justify-between hover:bg-muted/15 transition-all group"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-border/60">
                  <Image
                    src={classroom.owner.image || '/default-avatar.png'}
                    alt={classroom.owner.name}
                    width={36}
                    height={36}
                    className="rounded-full object-cover"
                  />
                </div>
                <p className="text-muted-foreground text-sm font-medium">Share an update or post a question...</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors mr-2">
                <div className="p-1.5 hover:bg-muted/20 rounded-lg">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="p-1.5 hover:bg-muted/20 rounded-lg">
                  <Paperclip className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {/* Posts List */}
          <div className="space-y-4">
            {sortedAssignments.length > 0 ? (
              sortedAssignments.map((assignment) => (
                <AssignmentPost key={assignment.id} assignment={assignment} classId={id} />
              ))
            ) : (
              <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3 shadow-md">
                <p className="text-muted-foreground font-semibold">No posts yet.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
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
