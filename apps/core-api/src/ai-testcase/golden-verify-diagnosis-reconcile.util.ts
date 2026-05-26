import type {
  GoldenVerifyCaseDiagnosis,
  GoldenVerifyFailureDiagnosis,
  GoldenVerifyFailedCasePayload,
} from './golden-verify-failure-diagnose.prompt';

/** Khớp worker `normalizeJudgeOutput` — CRLF → LF rồi trim. */
export function normalizeJudgeOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function stripErroneousExpectedFix(
  verdict: string,
  rootCause: GoldenVerifyCaseDiagnosis['rootCause'],
  suggestedFix: GoldenVerifyCaseDiagnosis['suggestedFix'],
): GoldenVerifyCaseDiagnosis['suggestedFix'] {
  if (!suggestedFix?.expectedOutput) return suggestedFix;

  const v = verdict.toUpperCase();
  const isWrongExpected =
    v === 'WRONG_ANSWER' ||
    rootCause === 'wrong_expected' ||
    rootCause === 'io_format_mismatch';

  if (isWrongExpected) return suggestedFix;

  const { expectedOutput: _removed, ...rest } = suggestedFix;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

/**
 * Gắn lại index đúng test fail, và với WRONG_ANSWER dùng actualOutput golden làm expectedOutput
 * (không tin gợi ý LLM có thể sai format / nhầm case).
 */
export function reconcileGoldenVerifyFailureDiagnosis(
  diagnosis: GoldenVerifyFailureDiagnosis,
  failedCases: GoldenVerifyFailedCasePayload[],
): GoldenVerifyFailureDiagnosis {
  const byIndex = new Map(failedCases.map((c) => [c.index, c]));

  const caseDiagnoses = diagnosis.caseDiagnoses.map((d, pos) => {
    let resolvedIndex = d.index;
    if (!byIndex.has(resolvedIndex) && pos < failedCases.length) {
      resolvedIndex = failedCases[pos]!.index;
    }

    const fc = byIndex.get(resolvedIndex);
    if (!fc) {
      return { ...d, index: resolvedIndex } satisfies GoldenVerifyCaseDiagnosis;
    }

    let suggestedFix = stripErroneousExpectedFix(fc.verdict, d.rootCause, d.suggestedFix);

    const verdictUpper = fc.verdict.toUpperCase();
    if (
      verdictUpper === 'WRONG_ANSWER' &&
      fc.actualOutput !== undefined &&
      fc.actualOutput !== ''
    ) {
      suggestedFix = {
        ...suggestedFix,
        expectedOutput: fc.actualOutput,
      };
      return {
        ...d,
        index: resolvedIndex,
        verdict: fc.verdict,
        rootCause:
          d.rootCause === 'golden_runtime' || d.rootCause === 'time_limit'
            ? 'wrong_expected'
            : d.rootCause === 'other'
              ? 'wrong_expected'
              : d.rootCause,
        suggestedFix,
        confidence: 'high' as const,
      };
    }

    return {
      ...d,
      index: resolvedIndex,
      verdict: fc.verdict,
      suggestedFix,
    } satisfies GoldenVerifyCaseDiagnosis;
  });

  return { ...diagnosis, caseDiagnoses };
}
