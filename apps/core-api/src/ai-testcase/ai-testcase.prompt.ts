import { z } from 'zod';
import { GenerateAiTestcaseDto } from './dto/generate-ai-testcase.dto';

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
`;

export function buildAiTestcaseMessages(input: GenerateAiTestcaseDto, promptVersion: string) {
  const maxTestCases = input.maxTestCases ?? 10;
  const supportedLanguages = input.supportedLanguages?.length
    ? input.supportedLanguages.join(', ')
    : 'not specified';

  const parts: string[] = [
    `<prompt_version>${promptVersion}</prompt_version>`,
    '<problem_context>',
    `Title: ${input.title}`,
    `Difficulty: ${input.difficulty ?? 'not specified'}`,
    `Time limit (ms): ${input.timeLimitMs ?? 'not specified'}`,
    `Memory limit (MB): ${input.memoryLimitMb ?? 'not specified'}`,
    `Supported languages: ${supportedLanguages}`,
    'Statement:',
    input.statement,
    '</problem_context>',
    '',
    '<io_spec>',
    input.ioSpec ?? 'UNKNOWN',
    '</io_spec>',
    '',
    '<generation_constraints>',
    `max_test_cases: ${maxTestCases}`,
    'Require diversity: boundary, typical, edge.',
    '</generation_constraints>',
  ];

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
