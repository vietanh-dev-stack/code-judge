'use client';

import React, { useState, useEffect } from 'react';
import { StatsCards } from '@/components/admin/dashboard/stats-cards';
import { SubmissionActivity } from '@/components/admin/dashboard/submission-activity';
import { VerdictDistribution } from '@/components/admin/dashboard/verdict-distribution';
import { LanguageDistribution } from '@/components/admin/dashboard/language-distribution';
import { TopProblems } from '@/components/admin/dashboard/top-problems';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getDashboardAnalytics, type DashboardAnalytics } from '@/services/admin-dashboard.apis';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getDashboardAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to load dashboard analytics:', err);
      toast.error('Failed to load system analytics', {
        description: err.message || 'Please ensure the core backend is running.',
      });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.success('Refreshing analytics data...', {
      description: 'Fetching latest submission and classroom logs from judge core.',
    });
    await loadData(true);
    setIsRefreshing(false);
    toast.success('Analytics updated successfully!');
  };

  const handleExport = () => {
    toast.success('Exporting report...', {
      description: 'Your report PDF is compiling and will download automatically.',
    });
  };

  if (isLoading || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-background text-foreground">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading system dashboard analytics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto bg-background text-foreground">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            System Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring of Code Judge engine, classrooms, problems and submission verdicts.
          </p>
        </div>

        {/* Header action buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 h-9 rounded-lg font-medium shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {/* <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            className="flex items-center gap-1.5 h-9 rounded-lg font-medium shadow-xs"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button> */}
        </div>
      </div>

      {/* 2. Stats Grid */}
      <StatsCards stats={analytics.stats} />

      {/* 3. Main Analytics Grid (Activity & Distribution Charts) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left / Middle: Activity Line/Area chart */}
        <SubmissionActivity dailyActivity={analytics.dailyActivity} />

        {/* Right: Verdict distribution Pie/Donut Chart */}
        <VerdictDistribution verdictData={analytics.verdictDistribution} />
      </div>

      {/* 4. Bottom Grid (Language usage & Top Problems) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Left: Language Distribution (Horizontal Bar Chart) */}
        <LanguageDistribution languageData={analytics.languageDistribution} />

        {/* Right: Top Problems (Most Attempted / Hardest Problems list) */}
        <TopProblems
          mostAttemptedProblems={analytics.topProblems.mostAttempted}
          hardestProblems={analytics.topProblems.hardest}
        />
      </div>
    </div>
  );
}
