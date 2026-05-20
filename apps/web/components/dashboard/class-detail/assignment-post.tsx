import { ArrowRight, CalendarDays, Trophy, ClipboardList, Swords, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Contest } from '@/services/contest.apis';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export function AssignmentPost({ assignment, classId }: { assignment: any; classId: string }) {
  const { title, description, publishedAt, dueAt, problem, contest } = assignment;

  // Distinguish between Problem, Contest, and Deleted
  const type = problem ? 'Assignment' : contest ? 'Contest' : 'Post';
  const Icon = problem ? ClipboardList : contest ? Swords : Send;

  const link = problem
    ? `/problem/${problem.id}`
    : contest
      ? `/dashboard/${classId}/contests/${contest.id}`
      : null;

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md group">
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${problem ? 'bg-blue-50 text-blue-600' : contest ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-600'}`}
        >
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {type}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400">{formatDate(publishedAt)}</span>
            </div>
          </div>

          <h2 className="text-lg font-bold text-black group-hover:text-gray-700 transition-colors">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2 leading-relaxed">{description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            {dueAt && (
              <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase">Due {formatDate(dueAt)}</span>
              </div>
            )}
          </div>
        </div>

        {link && (
          <Link
            href={link}
            className="flex-shrink-0 self-center w-10 h-10 flex items-center justify-center rounded-xl bg-black text-white hover:bg-gray-800 transition-all shadow-lg opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
        )}
      </div>
    </div>
  );
}
