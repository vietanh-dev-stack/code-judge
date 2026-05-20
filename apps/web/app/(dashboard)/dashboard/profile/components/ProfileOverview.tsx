'use client';

import type { UserProfileStats } from '@/services/profile.apis';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

interface ProfileOverviewProps {
  stats: UserProfileStats | null;
  loading: boolean;
  error: string | null;
}

export function ProfileOverview({ stats, loading, error }: ProfileOverviewProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-muted-foreground">
        Đang tải hoạt động...
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
        <h3 className="font-bold text-lg mb-2">Hoạt động gần đây</h3>
        <p className="text-sm text-muted-foreground">
          Chưa có hoạt động nào. Hãy giải bài tập để xem lịch sử tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-bold text-lg mb-4">Hoạt động gần đây</h3>
      <div className="space-y-4">
        {activities.map((activity, idx) => (
          <div
            key={`${activity.createdAt}-${idx}`}
            className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
          >
            <div className="w-3 h-3 rounded-full bg-primary mt-2 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{activity.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatRelativeTime(activity.createdAt)}
              </p>
            </div>
            <span className="text-xs bg-secondary text-foreground px-2 py-1 rounded whitespace-nowrap">
              {activity.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
