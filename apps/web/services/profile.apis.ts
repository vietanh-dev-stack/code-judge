import { apiFetch } from './api-client';

export interface DifficultyBreakdown {
  /** Distinct problems with Accepted submission (all testcases passed). */
  solved: number;
  /** Distinct problems with at least one graded submission. */
  attempted: number;
}

export interface UserProfileStats {
  problemsSolved: number;
  problemsAttempted: number;
  /** problemsSolved / problemsAttempted (percent). */
  successRate: number;
  byDifficulty: {
    easy: DifficultyBreakdown;
    medium: DifficultyBreakdown;
    hard: DifficultyBreakdown;
  };
  languages: { language: string; count: number }[];
  avgRuntimeMs: number | null;
  recentActivity: {
    type: 'submission' | 'contest' | 'class';
    title: string;
    status: string;
    createdAt: string;
  }[];
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const profileApi = {
  async getMyStats(): Promise<UserProfileStats> {
    return apiFetch<UserProfileStats>('/users/me/stats');
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: payload,
    });
  },

  async deactivateAccount(): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>('/users/me', { method: 'DELETE' });
  },
};
