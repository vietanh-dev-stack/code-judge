'use client';

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

export default function LeaderboardPage({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
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
      // Lắng nghe sự kiện kết quả bài nộp để cập nhật bảng xếp hạng
      socket.on('submission:finished', (payload: any) => {
        if (payload.contestId === contestId) {
          console.log('Submission finished for this contest, reloading leaderboard...');
          loadLeaderboard();
        }
      });

      return () => {
        socket.off('submission:finished');
      };
    }
  }, [contestId, socket]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Calculating rankings...</p>
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
      <div className="bg-black text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400 w-10 h-10" />
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{contest.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-gray-400 font-medium">
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

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
              <TableHead className="py-6 pl-8 font-black text-black text-xs uppercase tracking-widest w-20">Rank</TableHead>
              <TableHead className="py-6 font-black text-black text-xs uppercase tracking-widest">Participant</TableHead>
              <TableHead className="py-6 font-black text-black text-xs uppercase tracking-widest text-center">Solved</TableHead>
              <TableHead className="py-6 font-black text-black text-xs uppercase tracking-widest text-center">Score</TableHead>
              <TableHead className="py-6 font-black text-black text-xs uppercase tracking-widest text-center">Penalty</TableHead>
              {leaderboard[0]?.problems.map((p: any, idx: number) => (
                <TableHead key={p.problemId} className="py-6 font-black text-black text-xs uppercase tracking-widest text-center">
                  Problem {String.fromCharCode(65 + idx)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((row: any, index: number) => (
              <TableRow key={row.userId} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0">
                <TableCell className="py-6 pl-8">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                    index === 0 ? 'bg-amber-100 text-amber-700' : 
                    index === 1 ? 'bg-slate-100 text-slate-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm">
                      {row.userName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block">{row.userName}</span>
                      <span className="text-xs text-gray-400">ID: {row.userId.slice(0, 8)}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-6 text-center">
                  <span className="inline-flex items-center gap-1.5 font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    {row.solvedCount}
                  </span>
                </TableCell>
                <TableCell className="py-6 text-center font-black text-xl text-black">
                  {row.totalScore}
                </TableCell>
                <TableCell className="py-6 text-center font-medium text-gray-500">
                  {formatPenalty(row.totalPenalty)}
                </TableCell>
                {row.problems.map((p: any) => (
                  <TableCell key={p.problemId} className="py-6">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      {p.isSolved ? (
                        <div className="bg-emerald-500 text-white p-2 rounded-lg shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : p.attempts > 0 ? (
                        <div className="bg-rose-500 text-white p-2 rounded-lg shadow-lg shadow-rose-500/20">
                          <XCircle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="bg-gray-100 text-gray-300 p-2 rounded-lg">
                          <div className="w-5 h-5" />
                        </div>
                      )}
                      <span className={`text-[10px] font-bold ${p.isSolved ? 'text-emerald-600' : p.attempts > 0 ? 'text-rose-600' : 'text-gray-300'}`}>
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
