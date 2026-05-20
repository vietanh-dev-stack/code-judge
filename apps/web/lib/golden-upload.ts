import { goldenSolutionsApi, type PresignGoldenUploadDto } from '@/services/golden-solutions.apis';

/** PUT file bytes to S3/MinIO using a presigned URL (no JSON Content-Type unless file has a type). */
export async function putFileToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: file.type ? { 'Content-Type': file.type } : undefined,
    body: file,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${txt || res.statusText}`);
  }
}

/**
 * Full flow: presign → PUT → confirm. Returns the golden row after confirm.
 */
export async function uploadGoldenSolutionForProblem(params: {
  problemId: string;
  file: File;
  language?: string;
  isPrimary?: boolean;
}): Promise<{ goldenSolutionId: string; objectKey: string }> {
  const fileName = params.file.name?.trim() || 'main.py';
  const dto: PresignGoldenUploadDto = {
    language: params.language ?? 'python',
    isPrimary: params.isPrimary ?? true,
    fileName,
  };
  const presign = await goldenSolutionsApi.presignUpload(params.problemId, dto);
  await putFileToPresignedUrl(presign.uploadUrl, params.file);
  await goldenSolutionsApi.confirmUpload(presign.goldenSolutionId, { objectKey: presign.objectKey });
  return { goldenSolutionId: presign.goldenSolutionId, objectKey: presign.objectKey };
}
