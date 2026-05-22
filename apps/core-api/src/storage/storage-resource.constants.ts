export const STORAGE_RESOURCE_KINDS = [
  'avatar',
  'submission-source',
  'submission-artifact',
  'golden-solution',
  'ai-input',
  'ai-testcase',
  'export',
] as const;

export type StorageResourceKind = (typeof STORAGE_RESOURCE_KINDS)[number];

export const STORAGE_BIND_RESOURCE_KINDS = ['ai-input', 'export', 'golden-solution'] as const;

export type StorageBindResourceKind = (typeof STORAGE_BIND_RESOURCE_KINDS)[number];

/** Align with SubmissionsService — inline DB below this size. */
export const SUBMISSION_SOURCE_INLINE_MAX_BYTES = 8192;
