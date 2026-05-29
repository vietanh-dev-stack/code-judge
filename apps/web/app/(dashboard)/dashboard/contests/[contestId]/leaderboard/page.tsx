'use client';

import { UserAvatar } from '@/components/shared/user-avatar';
import { useEffect, useState, use } from 'react';
import { contestsApi } from '@/services/contest.apis';
import { useSocket } from '@/providers/socket-provider';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Clock, Medal, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function LeaderboardPage({ params }: { params: Promise<{ contestId: string }> }) {
  const { contestId } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const loadLeaderboard = async () => {
    try {
      const result = await contestsApi.getLeaderboard(contestId);
      setData(result);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();

    if (socket) {
      const handleFinished = (payload: any) => {
        if (payload.contestId === contestId) {
          console.log('Submission finished for this contest, reloading leaderboard...');
          loadLeaderboard();
        }
      };

      const handleCreated = (payload: any) => {
        if (payload.contestId === contestId) {
          console.log('Submission created for this contest, reloading leaderboard...');
          loadLeaderboard();
        }
      };

      const handleFailed = (payload: any) => {
        if (payload.contestId === contestId) {
          console.log('Submission failed for this contest, reloading leaderboard...');
          loadLeaderboard();
        }
      };

      socket.on('submission:finished', handleFinished);
      socket.on('submission:created', handleCreated);
      socket.on('submission:failed', handleFailed);

      return () => {
        socket.off('submission:finished', handleFinished);
        socket.off('submission:created', handleCreated);
        socket.off('submission:failed', handleFailed);
      };
    }
  }, [contestId, socket]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Calculating rankings...</p>
      </div>
    );
  }

  if (!data) return <div className="p-10 text-center">Contest not found</div>;

  const { contest, leaderboard } = data;

  const formatPenalty = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    return `${minutes}m`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400 w-10 h-10" />
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground md:text-5xl">
              {contest.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-muted-foreground font-medium">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Starts: {new Date(contest.startAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-400" />
              Rankings Updated Real-time
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-20 py-6 pl-8 text-xs font-black uppercase tracking-widest text-foreground">
                Rank
              </TableHead>
              <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-foreground">
                Participant
              </TableHead>
              <TableHead className="py-6 text-center text-xs font-black uppercase tracking-widest text-foreground">
                Solved
              </TableHead>
              <TableHead className="py-6 text-center text-xs font-black uppercase tracking-widest text-foreground">
                Score
              </TableHead>
              <TableHead className="py-6 text-center text-xs font-black uppercase tracking-widest text-foreground">
                Penalty
              </TableHead>
              {leaderboard[0]?.problems.map((p: any, idx: number) => (
                <TableHead
                  key={p.problemId}
                  className="py-6 text-center text-xs font-black uppercase tracking-widest text-foreground"
                >
                  Problem {String.fromCharCode(65 + idx)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((row: any, index: number) => (
              <TableRow
                key={row.userId}
                className="group border-b border-border/50 transition-colors last:border-0 hover:bg-muted/20"
              >
                <TableCell className="py-6 pl-8">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : index === 1
                          ? 'bg-slate-100 text-slate-700'
                          : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <UserAvatar
                        name={row.userName ?? '?'}
                        imageUrl={row.userAvatar}
                        fallbackClassName="bg-black text-white text-sm"
                      />
                    </div>
                    <div>
                      <span className="block font-bold text-foreground">{row.userName}</span>
                      <span className="text-xs text-muted-foreground">ID: {row.userId.slice(0, 8)}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-6 text-center">
                  <span className="inline-flex items-center gap-1.5 font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    {row.solvedCount}
                  </span>
                </TableCell>
                <TableCell className="py-6 text-center text-xl font-black text-foreground">
                  {row.totalScore}
                </TableCell>
                <TableCell className="py-6 text-center font-medium text-muted-foreground">
                  {formatPenalty(row.totalPenalty)}
                </TableCell>
                {row.problems.map((p: any) => (
                  <TableCell key={p.problemId} className="py-6">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      {p.isSolved ? (
                        <div className="bg-emerald-500 text-white p-2 rounded-lg shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : p.isPending ? (
                        <div className="bg-amber-500 text-white p-2 rounded-lg shadow-lg shadow-amber-500/20 flex items-center justify-center animate-spin">
                          <Clock className="w-5 h-5" />
                        </div>
                      ) : p.attempts > 0 ? (
                        <div className="bg-rose-500 text-white p-2 rounded-lg shadow-lg shadow-rose-500/20">
                          <XCircle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                          <div className="w-5 h-5" />
                        </div>
                      )}
                      <span
                        className={`text-[10px] font-bold ${p.isSolved ? 'text-emerald-500' : p.attempts > 0 ? 'text-rose-500' : 'text-muted-foreground'}`}
                      >
                        {p.attempts > 0 ? `${p.attempts} tries` : '-'}
                      </span>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
