import { z } from 'zod';

export const goldenVerifyRootCauseSchema = z.enum([
  'wrong_expected',
  'wrong_input',
  'io_format_mismatch',
  'golden_runtime',
  'time_limit',
  'statement_ambiguous',
  'other',
]);

export const goldenVerifySuggestedFixSchema = z.object({
  input: z.string().optional(),
  expectedOutput: z.string().optional(),
});

export const goldenVerifyCaseDiagnosisSchema = z.object({
  index: z.number().int().min(0),
  verdict: z.string().min(1),
  rootCause: goldenVerifyRootCauseSchema,
  explanation: z.string().min(1),
  suggestedFix: goldenVerifySuggestedFixSchema.optional(),
  confidence: z.enum(['high', 'medium', 'low']),
});

export const goldenVerifyFailureDiagnosisSchema = z.object({
  summary: z.string().min(1),
  caseDiagnoses: z.array(goldenVerifyCaseDiagnosisSchema).min(1),
  globalNotes: z.string().optional(),
});

export type GoldenVerifyFailureDiagnosis = z.infer<typeof goldenVerifyFailureDiagnosisSchema>;
export type GoldenVerifyCaseDiagnosis = z.infer<typeof goldenVerifyCaseDiagnosisSchema>;

const MAX_FAILED_CASES = 15;

const SYSTEM_PROMPT = `You diagnose why algorithmic test cases failed golden-solution verification.
Return ONLY one valid JSON object (no markdown fences). All human-readable strings in Vietnamese.

Schema:
{
  "summary": "string — overall diagnosis in 2-4 sentences",
  "caseDiagnoses": [
    {
      "index": 0,
      "verdict": "WRONG_ANSWER | RUNTIME_ERROR | TIME_LIMIT | PYTHON_NOT_FOUND",
      "rootCause": "wrong_expected | wrong_input | io_format_mismatch | golden_runtime | time_limit | statement_ambiguous | other",
      "explanation": "why this case failed, referencing input/expected/actual",
      "suggestedFix": { "input"?: "string", "expectedOutput"?: "string" },
      "confidence": "high | medium | low"
    }
  ],
  "globalNotes"?: "string"
}

Rules:
- The golden (reference) solution is TRUSTED as correct for WRONG_ANSWER: actualOutput from golden is ground truth; fix expectedOutput to match after judge normalization.
- Judge compares outputs after: replace \\r\\n with \\n, then trim() both sides.
- For WRONG_ANSWER: prefer rootCause wrong_expected and suggest expectedOutput = normalized actual (preserve intentional trailing newlines only if io_spec requires them).
- For RUNTIME_ERROR / PYTHON_NOT_FOUND: check input validity, golden compile/runtime, worker/Lambda — do NOT blindly suggest wrong expected fixes.
- For TIME_LIMIT: rootCause time_limit — suggest smaller input or note golden/timeLimit issue.
- suggestedFix: include ONLY fields that should change; omit unchanged fields.
- One caseDiagnosis per failed case; "index" MUST equal the numeric index attribute on each <case index="N"> in failed_cases (NOT 0..k-1 among failures only).
- For WRONG_ANSWER: suggestedFix.expectedOutput MUST be exactly the string inside <actual_output> for that case (character-for-character, including newlines).
- Do NOT invent a different expected output than actual_output for WRONG_ANSWER.
- Be concise; no full golden source code in output.`;

export type GoldenVerifyFailedCasePayload = {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  stderr?: string;
  verdict: string;
};

export function buildGoldenVerifyFailureDiagnoseMessages(input: {
  title?: string;
  statement?: string;
  ioSpec?: string;
  language: string;
  failedCases: GoldenVerifyFailedCasePayload[];
}) {
  const cases = input.failedCases.slice(0, MAX_FAILED_CASES);
  const caseBlocks = cases.map(
    (c) =>
      [
        `<case index="${c.index}">`,
        `<verdict>${c.verdict}</verdict>`,
        '<input>',
        c.input,
        '</input>',
        '<expected_output>',
        c.expectedOutput,
        '</expected_output>',
        '<actual_output>',
        c.actualOutput ?? '(none)',
        '</actual_output>',
        '<stderr>',
        c.stderr ?? '',
        '</stderr>',
        '</case>',
      ].join('\n'),
  );

  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: [
        '<problem_context>',
        `Title: ${input.title?.trim() || 'Không cung cấp'}`,
        'Statement:',
        input.statement?.trim() || 'Không cung cấp',
        '</problem_context>',
        '<io_spec>',
        input.ioSpec?.trim() || 'UNKNOWN',
        '</io_spec>',
        `<golden_language>${input.language}</golden_language>`,
        '<judge_normalization>trim + CRLF to LF before compare</judge_normalization>',
        '<failed_cases>',
        caseBlocks.join('\n'),
        '</failed_cases>',
        `<failed_count>${cases.length}</failed_count>`,
      ].join('\n'),
    },
  ];
}
