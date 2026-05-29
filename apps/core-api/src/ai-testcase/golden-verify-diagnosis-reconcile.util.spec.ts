import {
  normalizeJudgeOutput,
  reconcileGoldenVerifyFailureDiagnosis,
} from './golden-verify-diagnosis-reconcile.util';
import type { GoldenVerifyFailureDiagnosis } from './golden-verify-failure-diagnose.prompt';

describe('normalizeJudgeOutput', () => {
  it('normalizes CRLF and trims', () => {
    expect(normalizeJudgeOutput('  a\r\nb  \n')).toBe('a\nb');
  });
});

describe('reconcileGoldenVerifyFailureDiagnosis', () => {
  const failedCases = [
    {
      index: 0,
      input: '1',
      expectedOutput: '2\n',
      actualOutput: '3\n',
      verdict: 'WRONG_ANSWER',
    },
    {
      index: 2,
      input: '5',
      expectedOutput: '10',
      actualOutput: '11',
      verdict: 'WRONG_ANSWER',
    },
  ];

  it('replaces AI wrong expectedOutput with golden actualOutput', () => {
    const diagnosis: GoldenVerifyFailureDiagnosis = {
      summary: 'Sai expected',
      caseDiagnoses: [
        {
          index: 0,
          verdict: 'WRONG_ANSWER',
          rootCause: 'wrong_expected',
          explanation: 'Expected sai',
          suggestedFix: { expectedOutput: '999' },
          confidence: 'medium',
        },
      ],
    };

    const out = reconcileGoldenVerifyFailureDiagnosis(diagnosis, failedCases);
    expect(out.caseDiagnoses[0]?.suggestedFix?.expectedOutput).toBe('3\n');
    expect(out.caseDiagnoses[0]?.confidence).toBe('high');
  });

  it('remaps sequential AI indices to real verify indices', () => {
    const diagnosis: GoldenVerifyFailureDiagnosis = {
      summary: 'Hai case fail',
      caseDiagnoses: [
        {
          index: 0,
          verdict: 'WRONG_ANSWER',
          rootCause: 'wrong_expected',
          explanation: 'Case 1',
          suggestedFix: { expectedOutput: 'wrong' },
          confidence: 'low',
        },
        {
          index: 1,
          verdict: 'WRONG_ANSWER',
          rootCause: 'wrong_expected',
          explanation: 'Case 2',
          suggestedFix: { expectedOutput: 'wrong' },
          confidence: 'low',
        },
      ],
    };

    const out = reconcileGoldenVerifyFailureDiagnosis(diagnosis, failedCases);
    expect(out.caseDiagnoses[0]?.index).toBe(0);
    expect(out.caseDiagnoses[0]?.suggestedFix?.expectedOutput).toBe('3\n');
    expect(out.caseDiagnoses[1]?.index).toBe(2);
    expect(out.caseDiagnoses[1]?.suggestedFix?.expectedOutput).toBe('11');
  });

  it('strips expectedOutput suggestion for RUNTIME_ERROR', () => {
    const diagnosis: GoldenVerifyFailureDiagnosis = {
      summary: 'RE',
      caseDiagnoses: [
        {
          index: 0,
          verdict: 'RUNTIME_ERROR',
          rootCause: 'golden_runtime',
          explanation: 'Lỗi runtime',
          suggestedFix: { expectedOutput: 'should not apply' },
          confidence: 'high',
        },
      ],
    };

    const out = reconcileGoldenVerifyFailureDiagnosis(diagnosis, [
      {
        index: 0,
        input: 'x',
        expectedOutput: 'y',
        stderr: 'Traceback',
        verdict: 'RUNTIME_ERROR',
      },
    ]);

    expect(out.caseDiagnoses[0]?.suggestedFix?.expectedOutput).toBeUndefined();
  });
});
