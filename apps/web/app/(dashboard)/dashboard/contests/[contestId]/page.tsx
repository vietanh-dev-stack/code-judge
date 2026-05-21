'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { List, Calendar, Trophy, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Contest, contestsApi } from '@/services/contest.apis';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ContestDetailPage() {
  const params = useParams();
  const rawContestId = params?.contestId;
  const contestId = Array.isArray(rawContestId) ? rawContestId[0] : rawContestId;

  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [hasShownStartToast, setHasShownStartToast] = useState(false);

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
  // Keep current time updated so contest start becomes active automatically
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!contest || hasShownStartToast) return;

    const startAt = new Date(contest.startAt);
    const endAt = new Date(contest.endAt);

    if (currentTime >= startAt && currentTime <= endAt) {
      toast.success(
        'Contest has started! You can now access the problems and submit your solutions.',
        { position: 'top-center' },
      );
      setHasShownStartToast(true);
    }
  }, [currentTime, contest, hasShownStartToast]);

  // Helper function to check if contest is accessible
  const isContestAccessible = (contest: Contest): boolean => {
    const startAt = new Date(contest.startAt);
    const endAt = new Date(contest.endAt);
    return currentTime >= startAt && currentTime <= endAt;
  };

  // Helper function to get contest status message
  const getContestStatusMessage = (contest: Contest): string => {
    const startAt = new Date(contest.startAt);
    const endAt = new Date(contest.endAt);

    if (currentTime < startAt) {
      return `Contest will start at ${startAt.toLocaleString()}`;
    }
    if (currentTime > endAt) {
      return `Contest has ended at ${endAt.toLocaleString()}`;
    }
    return '';
  };

  useEffect(() => {
    if (!contestId) return;

    const loadContest = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await contestsApi.findById(contestId);
        setContest(data);
      } catch (err) {
        console.error('Failed to load contest:', err);
        setError('Failed to load contest. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadContest();
  }, [contestId]);

  if (!contestId) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-background/80 p-10 text-center text-lg text-destructive">
          Contest ID invalid.
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-background/80 p-10 text-center text-lg text-muted-foreground">
          Loading contest...
        </div>
      </main>
    );
  }

  if (error || !contest) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-background/80 p-10 text-center text-lg text-destructive">
          {error ?? 'Contest does not exist or an error has occurred.'}
        </div>
      </main>
    );
  }

  const startAt = contest.startAt ? new Date(contest.startAt).toLocaleString() : 'Not declared';
  const endAt = contest.endAt ? new Date(contest.endAt).toLocaleString() : 'Not declared';

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-10">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">
            Contest Detail
          </p>
          <h1 className="text-4xl font-bold tracking-tight">{contest.title}</h1>
          <p className="max-w-2xl text-muted-foreground">
            {contest.description || 'Không có mô tả contest.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" size="lg" asChild className="border-2">
            <Link
              href={`/dashboard/contests/${contestId}/leaderboard`}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Leaderboard
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="space-y-6 rounded-3xl border border-border bg-card p-7 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              {getStatusBadge(contest.status)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start At</p>
              <p className="font-semibold">{startAt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End At</p>
              <p className="font-semibold">{endAt}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Feedback Policy</p>
              <p className="font-semibold">{contest.testFeedbackPolicy}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max submissions/problem</p>
              <p className="font-semibold">{contest.maxSubmissionsPerProblem ?? 'Unlimited'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" />
              <span>Contest metadata</span>
            </div>
            <p>{contest.description || 'No description provided.'}</p>
          </div>
        </section>

        <div className="space-y-6">
          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <List className="w-5 h-5" /> Problem List
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentTime < new Date(contest.startAt) ? (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-sm text-yellow-700 dark:text-yellow-600">
                  <p className="font-semibold">{getContestStatusMessage(contest)}</p>
                  <p className="mt-2">
                    Contest problems are hidden until the contest starts. Please return after{' '}
                    {startAt}.
                  </p>
                </div>
              ) : !contest.problems || contest.problems.length === 0 ? (
                <div className="rounded-xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
                  Contest does not have any problems.
                </div>
              ) : (
                <div className="space-y-4">
                  {!isContestAccessible(contest) && (
                    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-600">
                      <p className="font-semibold">{getContestStatusMessage(contest)}</p>
                      <p className="mt-1">
                        The problems will be locked until the contest opens or after the contest has
                        ended.
                      </p>
                    </div>
                  )}
                  {contest.problems.map((item) => (
                    <div
                      key={item.problemId}
                      className={cn(
                        'rounded-2xl border border-border p-4',
                        isContestAccessible(contest) ? 'bg-background' : 'bg-muted/30 opacity-60',
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2 flex-1">
                          <h3 className="text-lg font-semibold">
                            {isContestAccessible(contest) ? (
                              <Link
                                href={`/problem/${item.problemId}?contestId=${contestId}`}
                                className="hover:text-primary"
                              >
                                {item.problem?.title ?? item.problemId}
                              </Link>
                            ) : (
                              <span className="cursor-not-allowed text-muted-foreground">
                                {item.problem?.title ?? item.problemId}
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.problem?.description
                              ? item.problem.description.slice(0, 120) + '...'
                              : 'No brief description.'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/10 px-3 py-1">
                            <Trophy className="w-4 h-4" /> {item.points ?? '-'} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
