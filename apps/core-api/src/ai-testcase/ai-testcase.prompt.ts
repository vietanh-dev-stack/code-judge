import { z } from 'zod';
import { GenerateAiTestcaseDto } from './dto/generate-ai-testcase.dto';
import type { TestgenBrief } from './ai-testcase-brief.prompt';

export const generatedTestcaseSchema = z.object({
  testCases: z.array(
    z.object({
      input: z.string().min(1),
      expectedOutput: z.string().min(1),
      isHidden: z.boolean().default(false),
      weight: z.number().int().min(1).max(100).default(1),
      explanation: z.string().optional(),
    }),
  ),
  suggestedTimeLimitMs: z.number().int().min(100).max(300_000).optional(),
  suggestedMemoryLimitMb: z.number().int().min(8).max(8192).optional(),
  notes: z.string().optional(),
  revisionNotes: z.string().optional(),
});

export type GeneratedTestcaseOutput = z.infer<typeof generatedTestcaseSchema>;

const SYSTEM_PROMPT = `You are an expert programming contest testcase designer.
Return ONLY one valid JSON object. Do not include markdown or extra prose.
The JSON must match this shape:
{
  "testCases": [
    { "input": "string", "expectedOutput": "string", "isHidden": boolean, "weight": number, "explanation"?: "string" }
  ],
  "suggestedTimeLimitMs": number,
  "suggestedMemoryLimitMb": number,
  "notes"?: "string",
  "revisionNotes"?: "string"
}

Quality requirements:
- Follow problem statement and exact IO format.
- Include diverse tests: boundary, typical, edge/failure-prone.
- Avoid duplicate tests that add no value.
- Ensure testcase count <= maxTestCases.
- Use concise explanations if provided; omit the explanation field entirely when max_test_cases > 6 to avoid oversized JSON.
- If spec is ambiguous, keep assumptions minimal in notes.
- NEVER use "...", "…", or placeholders in input or expectedOutput — every case must be runnable as-is on stdin/stdout.
- For grids/matrices: either print every line of the grid, or use smaller dimensions for hidden tests — never abbreviate with ellipsis.
- Always set suggestedTimeLimitMs and suggestedMemoryLimitMb for an online judge:
  - Infer expected optimal complexity from constraints (e.g. n≤10^5 → O(n log n) ~ 1-2s C++ ref; n≤10^6 → ~2-4s; brute O(n^2) only if n≤5000 with tight limit).
  - Hidden stress tests with large n need limits that accept the intended solution but reject typical brute force.
  - EASY: often 500-2000ms, 128-256MB; MEDIUM: 1000-5000ms, 256-512MB; HARD: 2000-10000ms, 256-1024MB.
  - Memory: account for arrays of size n (roughly 8*n bytes for int64 array) plus overhead — round up to 128/256/512/1024 MB tiers.
`;

export type BuildAiTestcaseMessageOptions = {
  /** Brief extracted from a long statement — replaces full statement in prompt. */
  testgenBrief?: TestgenBrief;
  /** First ~600 chars of statement when using brief (optional context). */
  statementExcerpt?: string;
  /** Force omit explanation fields on every testcase. */
  omitExplanations?: boolean;
  /** Omit explanations only; do not shorten IO strings. */
  compactOutput?: boolean;
  /** Ma trận/lưới — bắt buộc input/output đầy đủ. */
  requireFullIo?: boolean;
};

export function buildAiTestcaseMessages(
  input: GenerateAiTestcaseDto,
  promptVersion: string,
  options?: BuildAiTestcaseMessageOptions,
) {
  const maxTestCases = input.maxTestCases ?? 10;
  const omitExplanations = options?.omitExplanations ?? maxTestCases > 6;
  const supportedLanguages = input.supportedLanguages?.length
    ? input.supportedLanguages.join(', ')
    : 'not specified';

  const parts: string[] = [
    `<prompt_version>${promptVersion}</prompt_version>`,
    '<problem_context>',
    `Title: ${input.title}`,
    `Difficulty: ${input.difficulty ?? 'not specified'}`,
    `Current time limit (ms) on problem: ${input.timeLimitMs ?? 'not set — propose suitable limits'}`,
    `Current memory limit (MB) on problem: ${input.memoryLimitMb ?? 'not set — propose suitable limits'}`,
    `Supported languages: ${supportedLanguages}`,
  ];

  if (options?.testgenBrief) {
    parts.push(
      '<testgen_brief>',
      JSON.stringify(options.testgenBrief),
      '</testgen_brief>',
    );
    if (options.statementExcerpt?.trim()) {
      parts.push(
        '<statement_excerpt>',
        options.statementExcerpt.trim().slice(0, 600),
        '</statement_excerpt>',
      );
    }
  } else {
    parts.push('Statement:', input.statement);
  }

  parts.push('</problem_context>', '');
  parts.push(
    '<io_spec>',
    input.ioSpec ?? 'UNKNOWN',
    '</io_spec>',
    '',
    '<generation_constraints>',
    `max_test_cases: ${maxTestCases}`,
    'Require diversity: boundary, typical, edge.',
    'Return suggestedTimeLimitMs and suggestedMemoryLimitMs aligned with largest/hardest hidden test and stated constraints.',
    ...(omitExplanations ? ['Omit explanation field on every test case.'] : []),
    ...(options?.requireFullIo
      ? [
          'FULL IO REQUIRED: input and expectedOutput must contain complete data (all lines of grids/matrices). Forbidden: "...", "…", or verbal shortcuts like "100x100 grid".',
          'For very large stated dimensions, use smaller equivalent hidden tests (e.g. 5x5, 10x10) with full cell values, not placeholders.',
        ]
      : []),
    ...(options?.compactOutput && !options?.requireFullIo
      ? ['Omit explanation fields only; keep input and expectedOutput complete and valid.']
      : []),
    '</generation_constraints>',
  );

  if (input.supplementaryText?.trim()) {
    parts.push('', '<supplementary_document_optional>', input.supplementaryText, '</supplementary_document_optional>');
  }

  if (input.revision) {
    parts.push(
      '',
      '<previous_attempt_context>',
      `prompt_version_used: ${input.revision.promptVersionUsed ?? 'unknown'}`,
      `summary_or_previous_output: ${input.revision.previousOutputSummary ?? 'not provided'}`,
      `validator_or_human_issues: ${(input.revision.validatorIssues ?? []).join('; ') || 'none'}`,
      '</previous_attempt_context>',
      '',
      '<user_feedback>',
      input.revision.userFeedback ?? 'Please improve testcase quality while preserving valid tests.',
      '</user_feedback>',
      '',
      '<revision_instructions>',
      '- Address all feedback points.',
      '- Prefer adding/modifying tests instead of full rewrite unless required.',
      '- Keep IO format consistent with io_spec.',
      '- Return only final JSON object in the same schema.',
      '</revision_instructions>',
    );
  }

  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: parts.join('\n') },
  ];
}
