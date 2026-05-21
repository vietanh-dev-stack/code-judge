'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { profileApi, type UserProfileStats } from '@/services/profile.apis';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileOverview } from './components/ProfileOverview';
import { ProfileStatsTab } from './components/ProfileStatsTab';

type ProfileTab = 'overview' | 'stats';

function ProfilePageContent() {
  const { user, loading } = useAuthStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    profileApi
      .getMyStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setStatsError(err instanceof Error ? err.message : 'Failed to load stats');
        }
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">User not found.</p>
        <Link href="/login" className="text-primary underline">
          Login
        </Link>
      </div>
    );
  }

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'stats', label: 'Stats' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="h-32 md:h-48 relative bg-gradient-to-r from-primary/20 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <ProfileHeader user={user} stats={stats} statsLoading={statsLoading} />

        <div className="border-b border-border mb-8">
          <div className="flex gap-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 font-medium cursor-pointer text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <ProfileOverview stats={stats} loading={statsLoading} error={statsError} />
        )}
        {activeTab === 'stats' && (
          <ProfileStatsTab stats={stats} loading={statsLoading} error={statsError} />
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
