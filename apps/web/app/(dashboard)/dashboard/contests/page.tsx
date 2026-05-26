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

type TabStatus = 'ALL' | 'RUNNING' | 'PUBLISHED' | 'ENDED';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ContestsPage({ searchParams }: PageProps) {
  const { items: contests } = await contestsApi.findAll({ limit: 50 });

  const resolvedParams = await searchParams;

  const currentStatus = (resolvedParams?.status as TabStatus) || 'ALL';

  const filteredContests =
    currentStatus === 'ALL'
      ? contests
      : contests.filter((contest) => contest.status === currentStatus);

  const tabs: { id: TabStatus; label: string }[] = [
    { id: 'ALL', label: 'ALL' },
    { id: 'RUNNING', label: 'RUNNING' },
    { id: 'PUBLISHED', label: 'PUBLISHED' },
    { id: 'ENDED', label: 'ENDED' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 p-3 rounded-md text-sm font-semibold">
            Running
          </Badge>
        );
      case 'ENDED':
        return (
          <Badge
            variant="secondary"
            className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-md text-sm font-semibold"
          >
            Ended
          </Badge>
        );
      case 'PUBLISHED':
        return (
          <Badge
            variant="outline"
            className="border-blue-200 text-blue-600 bg-blue-50 p-3 rounded-md text-sm font-semibold"
          >
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-6 pb-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Public Contests</h1>
          <p className="text-lg text-primary/70 max-w-2xl leading-relaxed">
            Compete with others, solve challenging problems, and climb the leaderboard.
          </p>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="inline-flex items-center w-full max-w-2xl p-1.5 bg-slate-950/40 border border-primary/70 rounded-md">
            <div className="grid grid-cols-4 w-full gap-1">
              {tabs.map((tab) => {
                const isActive = currentStatus === tab.id;

                return (
                  <Link
                    key={tab.id}
                    href={tab.id === 'ALL' ? '?' : `?status=${tab.id}`}
                    className={`
                text-center py-2.5 px-3 text-sm font-bold tracking-wider rounded-md  transition-all duration-200
                ${
                  isActive
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/10'
                    : 'text-orange-100/70 hover:text-orange-500 hover:bg-slate-900/40'
                }
              `}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredContests.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-900 rounded-3xl">
            <Trophy className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">No contests scheduled</h2>
            <p className="text-gray-400 text-lg">Check back later for upcoming challenges!</p>
          </div>
        ) : (
          filteredContests.map((contest) => (
            <Link
              href={`/dashboard/contests/${contest.id}`}
              key={contest.id}
              className="group relative bg-slate-900/50 rounded-3xl shadow-sm hover:scale-105 transition-all duration-300 overflow-hidden flex flex-col h-full"
            >
              <div className="p-8 flex-1 flex flex-col space-y-6">
                <div>{getStatusBadge(contest.status)}</div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-fuchsia-100 transition-colors">
                    {contest.title}
                  </h3>
                  <p className="text-primary-light text-sm line-clamp-2 min-h-[40px] mt-4">
                    {contest.description || 'No description available for this contest.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary-light" />
                    </div>
                    <span className="text-[17px] text-primary-light">
                      {format(new Date(contest.startAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-primary-light" />
                    </div>
                    <span className="text-[17px] text-primary-light">
                      {format(new Date(contest.startAt), 'h:mm a')} -{' '}
                      {format(new Date(contest.endAt), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary-light" />
                    </div>
                    <span className="text-[17px] text-primary-light">Public Contest</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-primary/70 flex items-center justify-end">
                <Button className="text-md font-bold text-white cursor-pointer hover:scale-105 transition-transform px-6 py-4">
                  {contest.status === 'RUNNING' ? 'Join Now' : 'Details'}
                </Button>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
