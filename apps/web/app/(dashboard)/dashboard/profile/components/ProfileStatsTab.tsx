'use client';

import { Target, Zap } from 'lucide-react';
import type { UserProfileStats } from '@/services/profile.apis';

interface ProfileStatsTabProps {
  stats: UserProfileStats | null;
  loading: boolean;
  error: string | null;
}

function DifficultyBar({
  label,
  solved,
  attempted,
  colorClass,
}: {
  label: string;
  solved: number;
  attempted: number;
  colorClass: string;
}) {
  const pct = attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {solved}/{attempted} bài ({pct}%)
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className={`${colorClass} h-2 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {attempted === 0 && (
        <p className="text-xs text-muted-foreground mt-1">Chưa làm bài ở mức này</p>
      )}
    </div>
  );
}

export function ProfileStatsTab({ stats, loading, error }: ProfileStatsTabProps) {
  if (loading) {
    return <div className="text-muted-foreground p-6">Đang tải thống kê...</div>;
  }

  if (error) {
    return <div className="text-destructive text-sm p-6">{error}</div>;
  }

  if (!stats) {
    return <div className="text-muted-foreground p-6">Chưa có dữ liệu thống kê.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Tiến độ theo độ khó
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Số bài đã giải (Accepted) trên số bài bạn đã nộp submission
        </p>
        <div className="space-y-4">
          <DifficultyBar
            label="Easy"
            solved={stats.byDifficulty.easy.solved}
            attempted={stats.byDifficulty.easy.attempted}
            colorClass="bg-green-600"
          />
          <DifficultyBar
            label="Medium"
            solved={stats.byDifficulty.medium.solved}
            attempted={stats.byDifficulty.medium.attempted}
            colorClass="bg-yellow-500"
          />
          <DifficultyBar
            label="Hard"
            solved={stats.byDifficulty.hard.solved}
            attempted={stats.byDifficulty.hard.attempted}
            colorClass="bg-red-600"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Hiệu suất
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Tỷ lệ = bài đã pass hết testcase ÷ bài đã từng làm (có submission)
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <span className="text-sm font-medium">Tỷ lệ giải được</span>
            <span className="text-lg font-bold">{stats.successRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground px-1 -mt-2">
            {stats.problemsSolved} / {stats.problemsAttempted} bài
          </p>
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <span className="text-sm font-medium">Bài đã làm</span>
            <span className="text-lg font-bold">{stats.problemsAttempted}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <span className="text-sm font-medium">Bài đã giải (Accepted)</span>
            <span className="text-lg font-bold">{stats.problemsSolved}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <span className="text-sm font-medium">Thời gian chạy TB (bài Accepted)</span>
            <span className="text-lg font-bold">
              {stats.avgRuntimeMs != null ? `${stats.avgRuntimeMs}ms` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
