export type Judge0CaseVerdict =
  | 'Accepted'
  | 'Wrong'
  | 'TimeLimitExceeded'
  | 'MemoryLimitExceeded'
  | 'CompilationError'
  | 'RuntimeError'
  | 'InternalError';

export function mapJudge0Status(result: {
  status?: { id?: number; description?: string };
  message?: string | null;
}): Judge0CaseVerdict {
  const id = result.status?.id;
  const desc = (result.status?.description ?? '').toLowerCase();
  const msg = (result.message ?? '').toLowerCase();

  if (id === 3) {
    return 'Accepted';
  }
  if (id === 5) {
    return 'TimeLimitExceeded';
  }
  if (id === 6) {
    return 'CompilationError';
  }
  if (id === 13 || id === 14) {
    return 'InternalError';
  }
  if (desc.includes('memory limit') || msg.includes('memory limit')) {
    return 'MemoryLimitExceeded';
  }
  if (id === 4) {
    return 'Wrong';
  }
  if (id != null && id >= 7 && id <= 12) {
    return 'RuntimeError';
  }
  return 'Wrong';
}

export function caseVerdictToSubmissionStatus(
  verdict: Judge0CaseVerdict,
): 'Accepted' | 'Wrong' | 'TimeLimitExceeded' | 'MemoryLimitExceeded' | 'CompilationError' | 'RuntimeError' | 'Error' {
  switch (verdict) {
    case 'Accepted':
      return 'Accepted';
    case 'TimeLimitExceeded':
      return 'TimeLimitExceeded';
    case 'MemoryLimitExceeded':
      return 'MemoryLimitExceeded';
    case 'CompilationError':
      return 'CompilationError';
    case 'RuntimeError':
      return 'RuntimeError';
    case 'InternalError':
      return 'Error';
    default:
      return 'Wrong';
  }
}

export function resolveCaseVerdict(
  judgeVerdict: Judge0CaseVerdict,
  outputMatches: boolean,
): Judge0CaseVerdict {
  if (judgeVerdict === 'TimeLimitExceeded' || judgeVerdict === 'MemoryLimitExceeded') {
    return judgeVerdict;
  }
  if (judgeVerdict === 'CompilationError' || judgeVerdict === 'InternalError' || judgeVerdict === 'RuntimeError') {
    return judgeVerdict;
  }
  if (outputMatches) {
    return 'Accepted';
  }
  return 'Wrong';
}
