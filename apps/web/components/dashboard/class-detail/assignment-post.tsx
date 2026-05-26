'use client'

import { ArrowRight, CalendarDays, Trophy, ClipboardList, Send, MoreHorizontal, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function AssignmentPost({ assignment, classId }: { assignment: any; classId: string }) {
  const { title, description, publishedAt, dueAt, problem, contest } = assignment;

  const isContest = !!contest;
  const isProblem = !!problem;
  const router = useRouter();

  const link = isProblem
    ? `/problem/${problem.id}`
    : isContest
      ? `/dashboard/${classId}/contests/${contest.id}`
      : null;

  // Formatting for Contest timeline label
  const getContestTimelineInfo = () => {
    if (!contest) return '';
    const now = new Date();
    const start = new Date(contest.startAt);
    if (start > now) {
      const diffMs = start.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return `Starts in ${diffDays} day${diffDays > 1 ? 's' : ''} • ${new Date(contest.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return `Active • Ends ${formatDate(contest.endAt)}`;
  };

  // Dynamic duration calculation
  const getContestDuration = () => {
    if (!contest) return '120 Minutes';
    const diffMs = new Date(contest.endAt).getTime() - new Date(contest.startAt).getTime();
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} Minutes`;
  };

  if (isContest) {
    // REDESIGNED CONTEST CARD (Card 2)
    return (
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-md transition-all hover:shadow-lg group">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  Official Contest • {getContestTimelineInfo()}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <h2
              onClick={() => link && router.push(link)}
              className="cursor-pointer text-xl font-extrabold text-foreground group-hover:text-sky-400 transition-colors"
            >
              {title}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {description || 'Comprehensive evaluation covering class topics. Ensure your environment is set up for the proctored session.'}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 max-w-md">
              <div className="bg-muted/10 border border-border/60 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Duration</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{getContestDuration()}</p>
                </div>
              </div>
              <div className="bg-muted/10 border border-border/60 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Intensity</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">Medium-Hard</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-border/40 flex items-center justify-between">
              {link ? (
                <Link
                  href={link}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  Details
                </Link>
              ) : (
                <span className="text-xs font-bold text-muted-foreground">Details</span>
              )}

              {link && (
                <Link href={link}>
                  <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-2 shadow-lg shadow-primary/20 text-xs rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
                    Join Now
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // REDESIGNED ASSIGNMENT CARD (Card 1)
  return (
    <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-md transition-all hover:shadow-lg group">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/25 flex items-center justify-center">
          <ClipboardList className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                Class Assignment
              </span>
              <span className="text-xs text-muted-foreground/60">•</span>
              <span className="text-xs text-muted-foreground">Published {formatDate(publishedAt)}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {link ? (
            <Link href={link}>
              <h2 className="text-xl font-extrabold text-foreground group-hover:text-sky-400 hover:underline transition-colors cursor-pointer">
                {title}
              </h2>
            </Link>
          ) : (
            <h2 className="text-xl font-extrabold text-foreground group-hover:text-sky-400 transition-colors">
              {title}
            </h2>
          )}

          {description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">{description}</p>
          )}

          {/* Tag Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-lg">
              #{problem?.difficulty ? problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase() : 'Easy'}
            </Badge>
            {problem?.tags && problem.tags.map((tag: any) => (
              <Badge key={tag.id || tag.name} className="bg-muted text-muted-foreground border border-border text-xs px-2.5 py-0.5 rounded-lg">
                #{tag.name}
              </Badge>
            ))}
            {!problem?.tags && (
              <Badge className="bg-muted text-muted-foreground border border-border text-xs px-2.5 py-0.5 rounded-lg">
                #Strings
              </Badge>
            )}
          </div>

          {/* Footer */}
          {dueAt && (
            <div className="mt-6 pt-5 border-t border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-500/90 text-xs font-semibold">
                <CalendarDays className="h-4 w-4" />
                <span>Due: {formatDate(dueAt)}</span>
              </div>

              {link && (
                <Link
                  href={link}
                  className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline transition-colors"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
