/**
 * `problem.apis.ts` — client Core API `/problems` (cùng convention `auth.apis.ts`, `contest.apis.ts`).
 * - Tạo theo lớp: `create` + `CreateProblemDto` (bắt buộc `classRoomId`).
 * - Admin kho đề: `createAdmin` + `CreateAdminProblemDto` (không `classRoomId`, không ClassAssignment).
 */

import { apiFetch } from './api-client';

export interface Problem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  statementMd: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  mode: 'ALGO' | 'PROJECT';
  timeLimitMs: number;
  memoryLimitMb: number;
  isPublished: boolean;
  visibility: 'PRIVATE' | 'PUBLIC' | 'CONTEST_ONLY';
  supportedLanguages: string[] | null;
  maxTestCases: number;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: {
    problemId: string;
    tagId: string;
    tag: {
      id: string;
      name: string;
      slug: string;
      createdAt: string;
    };
  }[];
  testCases?: Array<{
    id: string;
    orderIndex: number;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    weight: number;
    createdAt: string;
    updatedAt: string;
  }>;
  assignments?: Array<{
    id: string;
    classRoomId: string;
    dueAt: string | null;
  }>;
}

export interface CreateProblemDto {
  classRoomId: string;
  dueAt?: string;
  title: string;
  description?: string;
  statementMd?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  mode?: 'ALGO' | 'PROJECT';
  timeLimitMs?: number;
  memoryLimitMb?: number;
  isPublished?: boolean;
  visibility?: 'PRIVATE' | 'PUBLIC' | 'CONTEST_ONLY';
  supportedLanguages?: string[];
  maxTestCases?: number;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    weight?: number;
  }>;
  tagIds?: string[];
}

/** POST /problems/admin — không `classRoomId`; backend không tạo ClassAssignment. */
export interface CreateAdminProblemDto {
  title: string;
  description: string;
  statementMd: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  mode?: 'ALGO' | 'PROJECT';
  timeLimitMs?: number;
  memoryLimitMb?: number;
  isPublished?: boolean;
  supportedLanguages?: string[];
  maxTestCases?: number;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    weight?: number;
  }>;
  tagIds?: string[];
}

export interface GenerateTestCasesDraftDto {
  title: string;
  statement: string;
  difficulty?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  supportedLanguages?: string[];
  maxTestCases?: number;
  ioSpec?: string;
  supplementaryText?: string;
  provider?: 'openai' | 'google';
  model?: string;
  preferCompactOutput?: boolean;
  preferFullIoOutput?: boolean;
  revision?: {
    promptVersionUsed?: string;
    previousOutputSummary?: string;
    userFeedback?: string;
    validatorIssues?: string[];
  };
}

export interface GenerateProblemStatementDto {
  topic: string;
  difficulty?: string;
  locale?: 'vi' | 'en';
  supplementaryText?: string;
  existingTitle?: string;
  existingStatement?: string;
  provider?: 'openai' | 'google';
  model?: string;
  revision?: {
    userFeedback?: string;
    previousOutputSummary?: string;
  };
}

export interface GeneratedProblemStatementParsed {
  title: string;
  description: string;
  statementMd: string;
  ioSpec: string;
  suggestedDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  suggestedTimeLimitMs?: number;
  suggestedMemoryLimitMb?: number;
  notes?: string;
}

export interface GenerateProblemStatementResult {
  provider: 'openai' | 'google';
  model: string;
  promptVersion: string;
  raw: string;
  parsed: GeneratedProblemStatementParsed | null;
  parseError?: string;
}

export interface GenerateTestCasesDraftResult {
  provider: 'openai' | 'google';
  model: string;
  promptVersion: string;
  raw: string;
  parsed: {
    testCases: Array<{
      input: string;
      expectedOutput: string;
      isHidden?: boolean;
      weight?: number;
      explanation?: string;
    }>;
    suggestedTimeLimitMs?: number;
    suggestedMemoryLimitMb?: number;
    notes?: string;
    revisionNotes?: string;
  } | null;
  parseError?: string;
  statementCharCount?: number;
  generationMode?: 'direct' | 'summarized';
  truncationSuspected?: boolean;
  maxTokensUsed?: number;
  longStatementWarning?: boolean;
  placeholderWarnings?: string[];
}

export interface UpdateProblemDto {
  dueAt?: string;
  title?: string;
  description?: string;
  statementMd?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  mode?: 'ALGO' | 'PROJECT';
  timeLimitMs?: number;
  memoryLimitMb?: number;
  isPublished?: boolean;
  visibility?: 'PRIVATE' | 'PUBLIC' | 'CONTEST_ONLY';
  supportedLanguages?: string[];
  maxTestCases?: number;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    weight?: number;
  }>;
  tagIds?: string[];
}

export type PaginatedProblems = {
  items: Problem[];
  total: number;
  page: number;
  limit: number;
};

export interface CalibrateProblemLimitsResult {
  problemId: string;
  goldenLanguage: string;
  memoryEnforced: boolean;
  cases: Array<{
    testCaseId: string;
    orderIndex: number;
    runtimeMs: number;
    memoryMb: number;
    verdict: string;
  }>;
  suggestedTimeLimitMs: number;
  suggestedMemoryLimitMb: number;
  currentTimeLimitMs: number;
  currentMemoryLimitMb: number;
}

export interface ProblemBankProgress {
  total: number;
  solved: number;
  byDifficulty: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}

/** GET /problems — danh sách public / theo lớp. */
export interface ProblemsListQuery {
  search?: string;
  page?: number;
  limit?: number;
  classRoomId?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  mode?: 'ALGO' | 'PROJECT';
  tagId?: string;
  tagSlug?: string;
}

/** GET /problems/admin/all */
export interface AdminProblemsListQuery {
  search?: string;
  page?: number;
  limit?: number;
  tagId?: string;
  tagSlug?: string;
}

function appendProblemsListParams(params: URLSearchParams, query: ProblemsListQuery) {
  if (query.search) params.set('search', query.search);
  if (query.page != null) params.set('page', String(query.page));
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.classRoomId) params.set('classRoomId', query.classRoomId);
  if (query.difficulty) params.set('difficulty', query.difficulty);
  if (query.mode) params.set('mode', query.mode);
  if (query.tagId) params.set('tagId', query.tagId);
  if (query.tagSlug) params.set('tagSlug', query.tagSlug);
}

export const problemsApi = {
  async findAll(query?: ProblemsListQuery, options?: RequestInit): Promise<PaginatedProblems> {
    const params = new URLSearchParams();
    if (query) appendProblemsListParams(params, query);
    const queryString = params.toString();
    return apiFetch(`/problems${queryString ? `?${queryString}` : ''}`, options);
  },

  /** Progress toàn problem bank (không theo filter danh sách). */
  async getBankProgress(options?: RequestInit): Promise<ProblemBankProgress> {
    return apiFetch('/problems/bank/progress', options);
  },

  async findAllAdmin(
    query?: AdminProblemsListQuery,
    options?: RequestInit,
  ): Promise<PaginatedProblems> {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.page != null) params.set('page', String(query.page));
    if (query?.limit != null) params.set('limit', String(query.limit));
    if (query?.tagId) params.set('tagId', query.tagId);
    if (query?.tagSlug) params.set('tagSlug', query.tagSlug);
    const queryString = params.toString();
    return apiFetch(`/problems/admin/all${queryString ? `?${queryString}` : ''}`, options);
  },

  async findById(
    id: string,
    query?: { contestId?: string },
    options?: RequestInit,
  ): Promise<Problem> {
    const params = new URLSearchParams();
    if (query?.contestId) params.set('contestId', query.contestId);
    const qs = params.toString();
    return apiFetch(`/problems/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`, options);
  },

  async create(dto: CreateProblemDto, options?: RequestInit): Promise<Problem> {
    return apiFetch('/problems', {
      ...options,
      method: 'POST',
      body: dto,
    });
  },

  async createAdmin(dto: CreateAdminProblemDto, options?: RequestInit): Promise<Problem> {
    return apiFetch('/problems/admin', {
      ...options,
      method: 'POST',
      body: dto,
    });
  },

  async generateTestCasesDraft(
    dto: GenerateTestCasesDraftDto,
    options?: RequestInit,
  ): Promise<GenerateTestCasesDraftResult> {
    return apiFetch('/problems/generate-test-cases-draft', {
      ...options,
      method: 'POST',
      body: dto,
    });
  },

  async generateStatementDraft(
    dto: GenerateProblemStatementDto,
    options?: RequestInit,
  ): Promise<GenerateProblemStatementResult> {
    return apiFetch('/problems/generate-statement-draft', {
      ...options,
      method: 'POST',
      body: dto,
    });
  },

  async calibrateLimits(
    id: string,
    body?: { measureTimeLimitMs?: number },
    options?: RequestInit,
  ): Promise<CalibrateProblemLimitsResult> {
    return apiFetch(`/problems/${encodeURIComponent(id)}/calibrate-limits`, {
      ...options,
      method: 'POST',
      body: body ?? {},
    });
  },

  async update(id: string, dto: UpdateProblemDto, options?: RequestInit): Promise<Problem> {
    return apiFetch(`/problems/${id}`, {
      ...options,
      method: 'PATCH',
      body: dto,
    });
  },

  async delete(id: string, options?: RequestInit): Promise<void> {
    return apiFetch(`/problems/${id}`, {
      ...options,
      method: 'DELETE',
    });
  },
};
