import { apiFetch } from './api-client';

export interface PresignUploadResponse {
  bucket: string;
  objectKey: string;
  uploadUrl: string;
}

export const storageApi = {
  async presignUpload(body: {
    resourceKind: 'submission-source';
    submissionId: string;
    fileName: string;
    expiresInSeconds?: number;
  }): Promise<PresignUploadResponse> {
    return apiFetch('/storage/presign/upload', {
      method: 'POST',
      body,
    });
  },
};
