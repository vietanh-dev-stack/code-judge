import { apiFetch } from './api-client';
import { Problem } from './problem.apis';

export interface Contest {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  startAt: string;
  endAt: string;
  status: 'DRAFT' | 'PUBLISHED' | 'RUNNING' | 'ENDED';
  testFeedbackPolicy: 'SUMMARY_ONLY' | 'VERBOSE';
  maxSubmissionsPerProblem: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  problems?: Array<{
    problemId: string;
    orderIndex: number;
    points: number;
    timeLimitMsOverride: number | null;
    memoryLimitMbOverride: number | null;
    problem: Problem;
  }>;
}

export interface CreateContestDto {
  classRoomId?: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  testFeedbackPolicy?: 'SUMMARY_ONLY' | 'VERBOSE';
  maxSubmissionsPerProblem?: number;
  password?: string;
  problems?: Array<{
    problemId: string;
    points?: number;
    orderIndex?: number;
    timeLimitMsOverride?: number;
    memoryLimitMbOverride?: number;
  }>;
}

export interface UpdateContestDto {
  classRoomId?: string;
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  testFeedbackPolicy?: 'SUMMARY_ONLY' | 'VERBOSE';
  maxSubmissionsPerProblem?: number;
  password?: string;
  problems?: Array<{
    problemId: string;
    points?: number;
    orderIndex?: number;
    timeLimitMsOverride?: number;
    memoryLimitMbOverride?: number;
  }>;
}

export const contestsApi = {
  async findAll(
    query?: { search?: string; page?: number; limit?: number; classRoomId?: string },
    options?: RequestInit,
  ): Promise<{
    items: Contest[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();

    if (query?.search) params.set('search', query.search);
    if (query?.page) params.set('page', query.page.toString());
    if (query?.limit) params.set('limit', query.limit.toString());
    if (query?.classRoomId) params.set('classRoomId', query.classRoomId);

    const queryString = params.toString();

    return apiFetch(`/contests${queryString ? `?${queryString}` : ''}`, options);
  },

  async findAllAdmin(
    query?: { search?: string; page?: number; limit?: number },
    options?: RequestInit,
  ): Promise<{
    items: Contest[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.page) params.set('page', query.page.toString());
    if (query?.limit) params.set('limit', query.limit.toString());
    const queryString = params.toString();
    return apiFetch(`/contests/admin${queryString ? `?${queryString}` : ''}`, options);
  },

  async findById(id: string, options?: RequestInit): Promise<Contest> {
    return apiFetch(`/contests/${id}`, options);
  },

  async create(dto: CreateContestDto): Promise<Contest> {
    return apiFetch('/contests', {
      method: 'POST',
      body: dto,
    });
  },

  async update(id: string, dto: UpdateContestDto): Promise<Contest> {
    return apiFetch(`/contests/${id}`, {
      method: 'PATCH',
      body: dto,
    });
  },

  async delete(id: string): Promise<void> {
    return apiFetch(`/contests/${id}`, {
      method: 'DELETE',
    });
  },

  async getLeaderboard(id: string): Promise<any> {
    return apiFetch(`/contests/${id}/leaderboard`);
  },
};
