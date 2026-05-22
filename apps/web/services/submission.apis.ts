import { apiFetch } from './api-client';

export interface CreateSubmissionDto {
  /** Deprecated — server uses JWT user id */
  userId?: string;
  problemId: string;
  contestId?: string;
  mode: 'ALGO' | 'PROJECT';
  language?: string;
  sourceCode?: string;
  sourceCodeObjectKey?: string;
  isDryRun?: boolean;
}

export interface ReserveSubmissionDto {
  problemId: string;
  contestId?: string;
  mode: 'ALGO' | 'PROJECT';
  language?: string;
  isDryRun?: boolean;
}

/** Align with core-api SUBMISSION_SOURCE_INLINE_MAX_BYTES */
export const SUBMISSION_SOURCE_INLINE_MAX_BYTES = 8192;

export interface Submission {
  id: string;
  status: string;
  score: number | null;
  error: string | null;
  logs?: string | null;
  caseResults?: unknown;
  language?: string | null;
  contestId?: string | null;
  isDryRun?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const submissionsApi = {
  async create(dto: CreateSubmissionDto): Promise<{ submissionId: string; status: string }> {
    return apiFetch('/submissions', {
      method: 'POST',
      body: dto,
    });
  },

  async reserve(dto: ReserveSubmissionDto): Promise<{ submissionId: string; status: string }> {
    return apiFetch('/submissions/reserve', {
      method: 'POST',
      body: dto,
    });
  },

  async finalize(
    submissionId: string,
    sourceCodeObjectKey: string,
  ): Promise<{ submissionId: string; status: string }> {
    return apiFetch(`/submissions/${encodeURIComponent(submissionId)}/finalize`, {
      method: 'POST',
      body: { sourceCodeObjectKey },
    });
  },

  async findById(id: string): Promise<Submission> {
    return apiFetch(`/submissions/${id}`);
  },

  async findAll(query?: { userId?: string; problemId?: string }): Promise<Submission[]> {
    const params = new URLSearchParams();
    if (query?.userId) params.set('userId', query.userId);
    if (query?.problemId) params.set('problemId', query.problemId);
    const queryString = params.toString();
    return apiFetch(`/submissions${queryString ? `?${queryString}` : ''}`);
  },
};
