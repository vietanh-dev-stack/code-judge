import { Metadata } from 'next';
import { contestsApi } from '@/services/contest.apis';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trophy, Users } from 'lucide-react';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'Contests | CodeJudge',
  description: 'Participate in programming contests and compete with others',
};

// Fetch runs against NEXT_PUBLIC_CORE_URL; docker/next build has no reachable API (localhost or VPS).
export const dynamic = 'force-dynamic';

export default async function ContestsPage() {
  const { items: contests } = await contestsApi.findAll({ limit: 50 });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Running</Badge>;
      case 'ENDED':
        return (
          <Badge variant="secondary" className="bg-red-500 hover:bg-red-500 text-white">
            Ended
          </Badge>
        );
      case 'PUBLISHED':
        return (
          <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">
            Published
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-100 pb-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Contests
          </h1>
          <p className="text-lg text-gray-500 max-w-xl">
            Compete with others, solve challenging problems, and climb the leaderboard.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Win prizes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {contests.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">No contests scheduled</h2>
            <p className="text-gray-500">Check back later for upcoming challenges!</p>
          </div>
        ) : (
          contests.map((contest) => (
            <div
              key={contest.id}
              className="group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-black/5 transition-all duration-300 overflow-hidden flex flex-col h-full"
            >
              <div className="absolute top-4 right-4 z-10">{getStatusBadge(contest.status)}</div>

              <div className="p-8 flex-1 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {contest.title}
                  </h3>
                  <p className="text-gray-500 text-sm line-clamp-2 min-h-[40px]">
                    {contest.description || 'No description available for this contest.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                    <span>{format(new Date(contest.startAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <span>
                      {format(new Date(contest.startAt), 'h:mm a')} -{' '}
                      {format(new Date(contest.endAt), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-400" />
                    </div>
                    <span>Public Contest</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <Link
                  href={`/dashboard/contests/${contest.id}`}
                  className="text-sm font-bold text-black hover:underline"
                >
                  View Rules
                </Link>
                <Button
                  asChild
                  className="rounded-xl bg-black hover:bg-gray-800 text-white px-6 font-bold shadow-lg shadow-black/10 transition-transform hover:scale-105 active:scale-95"
                >
                  <Link href={`/dashboard/contests/${contest.id}`}>
                    {contest.status === 'RUNNING' ? 'Join Now' : 'Details'}
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
