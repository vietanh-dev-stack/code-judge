'use client';

import type { UserProfileStats } from '@/services/profile.apis';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

interface ProfileOverviewProps {
  stats: UserProfileStats | null;
  loading: boolean;
  error: string | null;
}

export function ProfileOverview({ stats, loading, error }: ProfileOverviewProps) {
  const getStatusColorBadge = (status: string) => {
    return status === 'Accepted'
      ? 'bg-green-500/20 border-green-500 text-green-500'
      : status === 'Wrong'
        ? 'bg-red-500/20 border-red-500 text-red-500'
        : 'bg-amber-900/20 border-amber-500 text-amber-500';
  };
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-muted-foreground">
        Loading activity...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-destructive rounded-lg p-6 text-destructive text-sm">
        {error}
      </div>
    );
  }

  const activities = stats?.recentActivity ?? [];

  if (activities.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-bold text-lg mb-2">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">
          No activity yet. Solve some problems to see your history here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg p-6">
      <h3 className="font-bold text-lg mb-4 text-white">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, idx) => (
          <div
            key={`${activity.createdAt}-${idx}`}
            className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
          >
            <div className="w-3 h-3 rounded-full bg-primary mt-2 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-primary">{activity.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatRelativeTime(activity.createdAt)}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 border rounded-lg whitespace-nowrap ${getStatusColorBadge(activity.status)}`}
            >
              {activity.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
