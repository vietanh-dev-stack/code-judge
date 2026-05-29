export type ContestExportJobPayload = {
  exportId: string;
  contestId: string;
  requestedById: string;
};

export const REPORT_EXPORT_JOB_NAME = 'contest-export' as const;
