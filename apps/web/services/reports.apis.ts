import { apiFetch } from './api-client';

export type ReportDownloadResponse = {
  downloadUrl: string;
  fileName: string;
  expiresInSeconds: number;
};

export type ContestExportJob = {
  id: string;
  contestId: string;
  status: 'PENDING' | 'DONE' | 'FAILED';
  format: 'XLSX' | 'PDF';
  createdAt: string;
};

export type ContestExportStatus = ContestExportJob & {
  errorMessage?: string | null;
  downloadUrl?: string | null;
  fileName?: string | null;
  completedAt?: string | null;
};

function triggerBrowserDownload(url: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export const reportsApi = {
  async exportClassroom(classRoomId: string): Promise<ReportDownloadResponse> {
    return apiFetch(`/reports/classrooms/${classRoomId}/export`);
  },

  async exportProblem(
    classRoomId: string,
    problemId: string,
  ): Promise<ReportDownloadResponse> {
    return apiFetch(`/reports/classrooms/${classRoomId}/problems/${problemId}/export`);
  },

  async createContestExport(contestId: string): Promise<ContestExportJob> {
    return apiFetch(`/reports/contests/${contestId}/exports`, {
      method: 'POST',
      body: { format: 'XLSX' },
    });
  },

  async getContestExport(contestId: string, exportId: string): Promise<ContestExportStatus> {
    return apiFetch(`/reports/contests/${contestId}/exports/${exportId}`);
  },

  async downloadClassroomReport(classRoomId: string) {
    const res = await this.exportClassroom(classRoomId);
    triggerBrowserDownload(res.downloadUrl, res.fileName);
    return res;
  },

  async downloadProblemReport(classRoomId: string, problemId: string) {
    const res = await this.exportProblem(classRoomId, problemId);
    triggerBrowserDownload(res.downloadUrl, res.fileName);
    return res;
  },

  async exportAdminProblem(problemId: string): Promise<ReportDownloadResponse> {
    return apiFetch(`/reports/admin/problems/${problemId}/export`);
  },

  async createAdminContestExport(contestId: string): Promise<ContestExportJob> {
    return apiFetch(`/reports/admin/contests/${contestId}/exports`, {
      method: 'POST',
      body: { format: 'XLSX' },
    });
  },

  async downloadAdminProblemReport(problemId: string) {
    const res = await this.exportAdminProblem(problemId);
    triggerBrowserDownload(res.downloadUrl, res.fileName);
    return res;
  },

  async downloadAdminContestReport(
    contestId: string,
    options?: { pollMs?: number; maxAttempts?: number },
  ) {
    const pollMs = options?.pollMs ?? 800;
    const maxAttempts = options?.maxAttempts ?? 40;
    const job = await this.createAdminContestExport(contestId);

    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getContestExport(contestId, job.id);
      if (status.status === 'DONE' && status.downloadUrl && status.fileName) {
        triggerBrowserDownload(status.downloadUrl, status.fileName);
        return status;
      }
      if (status.status === 'FAILED') {
        throw new Error(status.errorMessage ?? 'Export failed');
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
    throw new Error('Export timed out — thử lại sau');
  },

  async downloadContestReport(contestId: string, options?: { pollMs?: number; maxAttempts?: number }) {
    const pollMs = options?.pollMs ?? 800;
    const maxAttempts = options?.maxAttempts ?? 40;
    const job = await this.createContestExport(contestId);

    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getContestExport(contestId, job.id);
      if (status.status === 'DONE' && status.downloadUrl && status.fileName) {
        triggerBrowserDownload(status.downloadUrl, status.fileName);
        return status;
      }
      if (status.status === 'FAILED') {
        throw new Error(status.errorMessage ?? 'Export failed');
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
    throw new Error('Export timed out — thử lại sau');
  },
};
