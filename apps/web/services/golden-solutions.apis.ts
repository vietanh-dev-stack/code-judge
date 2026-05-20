/**
 * Core API golden solutions — presign upload → PUT MinIO → confirm.
 */

import { apiFetch } from './api-client';

export interface PresignGoldenUploadDto {
  language: string;
  isPrimary?: boolean;
  fileName?: string;
  expiresInSeconds?: number;
}

export interface PresignGoldenUploadResult {
  goldenSolutionId: string;
  problemId: string;
  language: string;
  isPrimary: boolean;
  bucket: string;
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface ConfirmGoldenUploadDto {
  objectKey: string;
}

export interface GoldenSolutionListItem {
  id: string;
  language: string;
  isPrimary: boolean;
  sourceCodeObjectKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export const goldenSolutionsApi = {
  async presignUpload(
    problemId: string,
    dto: PresignGoldenUploadDto,
    options?: RequestInit,
  ): Promise<PresignGoldenUploadResult> {
    return apiFetch(`/problems/${encodeURIComponent(problemId)}/golden-solutions/presign-upload`, {
      ...options,
      method: 'POST',
      body: dto,
    });
  },

  async confirmUpload(
    goldenSolutionId: string,
    dto: ConfirmGoldenUploadDto,
    options?: RequestInit,
  ): Promise<GoldenSolutionListItem> {
    return apiFetch(`/golden-solutions/${encodeURIComponent(goldenSolutionId)}/confirm-upload`, {
      ...options,
      method: 'POST',
      body: dto,
    });
  },

  async listForProblem(problemId: string, options?: RequestInit): Promise<GoldenSolutionListItem[]> {
    return apiFetch(`/problems/${encodeURIComponent(problemId)}/golden-solutions`, options);
  },
};
