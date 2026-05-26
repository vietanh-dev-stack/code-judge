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
        <span className={`text-sm font-medium text-muted-foreground`}>{label}</span>
        <span className="text-sm text-muted-foreground">
          {solved}/{attempted} problems ({pct}%)
        </span>
      </div>
      <div className="w-full bg-slate-400 rounded-full h-2">
        <div
          className={`${colorClass} h-2 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {attempted === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          No problems attempted at this difficulty level
        </p>
      )}
    </div>
  );
}

export function ProfileStatsTab({ stats, loading, error }: ProfileStatsTabProps) {
  if (loading) {
    return <div className="text-muted-foreground p-6">Loading statistics...</div>;
  }

  if (error) {
    return <div className="text-destructive text-sm p-6">{error}</div>;
  }

  if (!stats) {
    return <div className="text-muted-foreground p-6">No statistics available.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2 text-primary">
          <Target className="w-5 h-5" />
          Progress by Difficulty
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Number of problems solved (Accepted) out of the total problems attempted
        </p>
        <div className="space-y-4">
          <DifficultyBar
            label="Easy"
            solved={stats.byDifficulty.easy.solved}
            attempted={stats.byDifficulty.easy.attempted}
            colorClass="bg-emerald-500"
          />
          <DifficultyBar
            label="Medium"
            solved={stats.byDifficulty.medium.solved}
            attempted={stats.byDifficulty.medium.attempted}
            colorClass="bg-amber-500"
          />
          <DifficultyBar
            label="Hard"
            solved={stats.byDifficulty.hard.solved}
            attempted={stats.byDifficulty.hard.attempted}
            colorClass="bg-rose-500"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2 text-primary">
          <Zap className="w-5 h-5" />
          Performance
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Success Rate = Problems Accepted / Problems Attempted (with submissions)
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary rounded-lg">
            <span className="text-sm font-medium">Success Rate</span>
            <span className="text-lg font-bold">{stats.successRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground px-1 -mt-2">
            {stats.problemsSolved} / {stats.problemsAttempted} problems
          </p>
          <div className="flex items-center justify-between p-4 bg-primary rounded-lg">
            <span className="text-sm font-medium">Problems Attempted</span>
            <span className="text-lg font-bold">{stats.problemsAttempted}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-primary rounded-lg">
            <span className="text-sm font-medium">Problems Solved (Accepted)</span>
            <span className="text-lg font-bold">{stats.problemsSolved}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-primary rounded-lg">
            <span className="text-sm font-medium">Average Runtime (Accepted)</span>
            <span className="text-lg font-bold">
              {stats.avgRuntimeMs != null ? `${stats.avgRuntimeMs}ms` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
