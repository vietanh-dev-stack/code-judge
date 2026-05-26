'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  List,
  Trophy,
  BarChart3,
  Info,
  ChartNoAxesColumnIncreasing,
  Clock11,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Contest, contestsApi } from '@/services/contest.apis';
import { cn, formatDuration } from '@/lib/utils';
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
      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-background/80 p-10 text-center text-lg text-destructive">
          Contest ID invalid.
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-background/80 p-10 text-center text-lg text-muted-foreground">
          Loading contest...
        </div>
      </main>
    );
  }

  if (error || !contest) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-background/80 p-10 text-center text-lg text-destructive">
          {error ?? 'Contest does not exist or an error has occurred.'}
        </div>
      </main>
    );
  }

  const startAt = contest.startAt ? new Date(contest.startAt).toLocaleString() : 'Not declared';
  const endAt = contest.endAt ? new Date(contest.endAt).toLocaleString() : 'Not declared';

  const durationText =
    contest.startAt && contest.endAt
      ? formatDuration(new Date(contest.endAt).getTime() - new Date(contest.startAt).getTime())
      : 'Not declared';

  const startAtDate = new Date(contest.startAt);
  const endAtDate = new Date(contest.endAt);

  let currentStatus: 'UPCOMING' | 'RUNNING' | 'FINISHED' = 'UPCOMING';
  if (currentTime >= endAtDate) {
    currentStatus = 'FINISHED';
  } else if (currentTime >= startAtDate) {
    currentStatus = 'RUNNING';
  }

  let timeSubMessage = '';
  if (currentStatus === 'UPCOMING') {
    timeSubMessage = `Starting in ${formatDuration(startAtDate.getTime() - currentTime.getTime())}`;
  } else if (currentStatus === 'RUNNING') {
    timeSubMessage = `Ending in ${formatDuration(endAtDate.getTime() - currentTime.getTime())}`;
  } else {
    timeSubMessage = 'Contest ended';
  }

  const totalDuration =
    startAtDate.getTime() -
    new Date(contest.startAt || startAtDate.getTime() - 30 * 60 * 1000).getTime();
  const timeLeft = Math.max(0, startAtDate.getTime() - currentTime.getTime());

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  let formattedCountdown = '';

  if (days > 0) {
    formattedCountdown = `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } else if (hours > 0) {
    formattedCountdown = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else {
    formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const strokeDashoffset = totalDuration > 0 ? 515.2 - (timeLeft / totalDuration) * 515.2 : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-10">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-primary">Contest Detail</p>
          <h1 className="text-4xl font-bold tracking-tight">{contest.title}</h1>
          <p className="max-w-2xl text-muted-foreground">
            {contest.description || 'Không có mô tả contest.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button size="lg" asChild className="border border-primary">
            <Link
              href={`/dashboard/contests/${contestId}/leaderboard`}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5 text-white" />
              Leaderboard
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="border border-primary text-primary hover:bg-primary/20 hover:text-primary"
          >
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="flex flex-col gap-2 space-y-6 rounded-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Status */}
            <div className="flex items-center justify-center gap-6 border border-border bg-slate-900 rounded-xl py-5">
              <div className="rounded-lg bg-amber-700/20 p-2">
                <ChartNoAxesColumnIncreasing className="h-7 w-7 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <h3 className="text-lg text-primary-light tracking-widest">STATUS</h3>
                <p
                  className={`text-2xl font-semibold ${
                    currentStatus === 'UPCOMING'
                      ? 'text-primary/80'
                      : currentStatus === 'RUNNING'
                        ? 'text-green-600'
                        : 'text-red-600'
                  }`}
                >
                  {currentStatus === 'UPCOMING' && 'Starting Soon'}
                  {currentStatus === 'RUNNING' && 'Running'}
                  {currentStatus === 'FINISHED' && 'Finished'}
                </p>
                <p className="text-primary-light/70">
                  {currentStatus === 'UPCOMING'
                    ? timeSubMessage
                    : currentStatus === 'RUNNING'
                      ? 'Live now'
                      : 'Contest ended'}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-center gap-6 border border-border bg-slate-900 rounded-xl py-5">
              <div className="rounded-lg bg-sky-900 p-2">
                <Clock11 className="h-7 w-7 text-blue-400" />
              </div>
              <div className="flex flex-col items-start">
                <h3 className="text-lg text-primary-light tracking-widest">DURATION</h3>
                <p className={`text-2xl font-semibold text-blue-400`}>{durationText}</p>
                <p className="text-primary-light/70">Single continues session</p>
              </div>
            </div>
          </div>

          {/* Contest Description */}
          <div className="overflow-hidden rounded-3xl border border-orange-500/10 bg-[#071226] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div className="flex items-center gap-3">
                <Info className="h-6 w-6 text-primary" />

                <h2 className="text-lg font-bold text-slate-100">Contest Configuration</h2>
              </div>
            </div>

            {/* Content */}
            <div className="divide-y divide-white/5">
              <div className="grid grid-cols-2 px-6 py-6">
                <p className="text-lg font-medium uppercase text-orange-100/90">Start Time</p>

                <p className="text-lg text-slate-200">{startAt}</p>
              </div>

              <div className="grid grid-cols-2 px-6 py-6">
                <p className="text-lg font-medium uppercase text-orange-100/90">End Time</p>

                <p className="text-lg text-slate-200">{endAt}</p>
              </div>

              <div className="grid grid-cols-2 px-6 py-6">
                <p className="text-lg font-medium uppercase text-orange-100/90">Feedback Policy</p>

                <p className="text-lg text-emerald-400">
                  {contest.testFeedbackPolicy === 'SUMMARY_ONLY' ? 'Summary Only' : 'Verbose'}
                </p>
              </div>

              <div className="grid grid-cols-2 px-6 py-6">
                <p className="text-lg font-medium uppercase text-orange-100/90">Max Submissions</p>

                <p className="text-lg text-slate-200">
                  {contest.maxSubmissionsPerProblem ?? 'Unlimited'}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-orange-500/10 bg-[#071226] shadow-2xl ">
            <div className="flex items-center justify-between border-b border-white/5 mb-4 px-6 py-5">
              <div className="flex items-center gap-3">
                <Info className="h-6 w-6 text-primary" />

                <h2 className="text-lg font-bold text-slate-100">Contest Description</h2>
              </div>
            </div>
            <div className="px-6 py-2">
              <p className="text-lg">{contest.description || 'This contest has no description'}</p>
            </div>
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
              {currentTime < startAtDate ? (
                /* Giao diện Locked có đồng hồ đếm ngược vòng tròn theo ảnh mẫu */
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  {/* Vòng tròn đếm ngược SVG */}
                  <div className="relative flex items-center justify-center w-48 h-48 mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Vòng nền phía dưới */}
                      <circle
                        cx="96"
                        cy="96"
                        r="90"
                        className="stroke-slate-800"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      {/* Vòng tiến trình màu cam sáng rực */}
                      <circle
                        cx="96"
                        cy="96"
                        r="90"
                        className="stroke-orange-500 transition-all duration-1000 ease-linear"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray="515.2"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Số hiển thị ở giữa tâm */}
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-100 tracking-tight">
                        {formattedCountdown}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary-light mt-1">
                        To Kickoff
                      </span>
                    </div>
                  </div>

                  {/* Nội dung thông báo ẩn bài viết */}
                  <h3 className="text-xl font-bold text-slate-200 mb-2">Content Encrypted</h3>
                  <p className="max-w-md text-[16px] text-primary-light leading-relaxed">
                    Contest problems are hidden until the official start time. Please stay on this
                    page; the problems will unlock automatically.
                  </p>

                  {/* Danh sách bài toán ở trạng thái Skeleton bị khóa mờ mờ phía dưới */}
                  <div className="w-full mt-10 space-y-3 opacity-25 pointer-events-none select-none ">
                    {[1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-black p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 font-bold text-slate-400 text-sm">
                            {index}
                          </div>
                          <div className="space-y-2 text-left">
                            <div className="h-4 w-32 rounded bg-slate-700"></div>
                            <div className="h-3 w-48 rounded bg-slate-800"></div>
                          </div>
                        </div>
                        <span className="rounded-full border border-slate-800 p-1.5 bg-slate-900">
                          <svg
                            className="h-4 w-4 text-slate-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !contest.problems || contest.problems.length === 0 ? (
                <div className="rounded-xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
                  Contest does not have any problems.
                </div>
              ) : (
                /* Giao diện hiển thị danh sách bài tập thực tế khi cuộc thi đã bắt đầu công khai */
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
                  {contest.problems.map((item, idx) => (
                    <Link
                      href={`/problem/${item.problemId}?contestId=${contestId}`}
                      key={item.problemId}
                      className={cn(
                        'rounded-2xl border border-border p-4 transition-all block',
                        isContestAccessible(contest)
                          ? 'bg-background hover:border-primary/40'
                          : 'bg-muted/30 opacity-60',
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted border font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold">
                              <span className="cursor-pointer text-muted-foreground hover:text-primary">
                                {item.problem?.title ?? item.problemId}
                              </span>
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.problem?.description || 'No brief description.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground self-end sm:self-center">
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-muted/10 px-3 py-1 text-xs text-primary">
                            <Trophy className="w-3.5 h-3.5" /> {item.points ?? '-'} pts
                          </span>
                        </div>
                      </div>
                    </Link>
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
