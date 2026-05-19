import { apiFetch } from './api-client';

export interface ProblemItem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  attempts: number;
  accepted: number;
  acRate: number;
}

export interface DashboardAnalytics {
  stats: {
    totalUsers: number;
    totalProblems: number;
    totalContests: number;
    activeClassrooms: number;
  };
  dailyActivity: {
    day: string;
    total: number;
    accepted: number;
    failed: number;
  }[];
  verdictDistribution: {
    name: string;
    value: number;
    color: string;
    percentage: string;
  }[];
  languageDistribution: {
    name: string;
    value: number;
    color: string;
    percentage: string;
  }[];
  topProblems: {
    mostAttempted: ProblemItem[];
    hardest: ProblemItem[];
  };
}

export async function getDashboardAnalytics(cookieHeader?: string): Promise<DashboardAnalytics> {
  return apiFetch<DashboardAnalytics>('/admin/dashboard/analytics', {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
}
