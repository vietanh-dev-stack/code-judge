import { z } from 'zod';
import type { GenerateAiProblemStatementDto } from './dto/generate-ai-problem-statement.dto';

export const generatedProblemStatementSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  statementMd: z.string().min(1).max(20000),
  ioSpec: z.string().min(1).max(10000),
  suggestedDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  suggestedTimeLimitMs: z.number().int().min(100).max(300000).optional(),
  suggestedMemoryLimitMb: z.number().int().min(8).max(8192).optional(),
  notes: z.string().optional(),
});

export type GeneratedProblemStatementOutput = z.infer<typeof generatedProblemStatementSchema>;

const PROMPT_VERSION = 'ai-problem-statement-v1';

const SYSTEM_PROMPT_VI = `You are an expert competitive programming problem author for an online judge (stdin/stdout, ALGO mode).
Return ONLY one valid JSON object (no markdown fences).

Schema:
{
  "title": "short problem title",
  "description": "1-2 sentence summary for problem list",
  "statementMd": "full problem in Markdown (Vietnamese)",
  "ioSpec": "concise I/O spec for testcase generators",
  "suggestedDifficulty": "EASY | MEDIUM | HARD",
  "suggestedTimeLimitMs": number,
  "suggestedMemoryLimitMb": number,
  "notes": "optional author notes"
}

statementMd MUST include clear sections:
## Đề bài
## Input
## Output
## Ví dụ
(at least one sample with explanation)
## Gợi ý / Lưu ý (optional constraints)

Rules:
- Classic stdin/stdout — no interactive or file I/O unless user explicitly requests.
- Constraints must be realistic (n ranges, value bounds).
- ioSpec: one paragraph describing exact format for automated test generation.
- Vietnamese for title/description/statementMd unless user asks for English.
- Do not include solution code or hidden test answers in statementMd.
- suggestedTimeLimitMs / suggestedMemoryLimitMb: MUST match ## Constraints in statementMd (n, m, value ranges).
  - Choose limits so a correct intended algorithm passes with ~2x margin; brute O(n^2) on large n should TLE.
  - EASY: ~500-2000ms, 128-256MB; MEDIUM: ~1000-5000ms, 256-512MB; HARD: ~2000-15000ms, 512-1024MB.
  - If n≤10^5 and solution is O(n log n), C++ reference ~1s → suggest ~2000ms; Python students get 2x at judge via language multiplier.`;

const SYSTEM_PROMPT_EN = `You are an expert competitive programming problem author for an online judge (stdin/stdout, ALGO mode).
Return ONLY one valid JSON object (no markdown fences).

Schema:
{
  "title": "short problem title",
  "description": "1-2 sentence summary for problem list",
  "statementMd": "full problem in Markdown (English)",
  "ioSpec": "concise I/O spec for testcase generators",
  "suggestedDifficulty": "EASY | MEDIUM | HARD",
  "suggestedTimeLimitMs": number,
  "suggestedMemoryLimitMb": number,
  "notes": "optional author notes"
}

statementMd MUST include: Problem, Input, Output, at least one Example, Constraints.
ioSpec: exact format for automated testcase generation.
No solution code in statementMd.
Set suggestedTimeLimitMs and suggestedMemoryLimitMb from constraints (same rules as Vietnamese prompt).`;

export function buildAiProblemStatementMessages(input: GenerateAiProblemStatementDto) {
  const locale = input.locale === 'en' ? 'en' : 'vi';
  const system = locale === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_VI;

  const parts: string[] = [
    `<prompt_version>${PROMPT_VERSION}</prompt_version>`,
    '<author_request>',
    input.topic.trim(),
    '</author_request>',
  ];

  if (input.difficulty?.trim()) {
    parts.push(`<target_difficulty>${input.difficulty.trim()}</target_difficulty>`);
  }
  if (input.supplementaryText?.trim()) {
    parts.push('<supplementary>', input.supplementaryText.trim(), '</supplementary>');
  }
  if (input.existingTitle?.trim()) {
    parts.push('<existing_title>', input.existingTitle.trim(), '</existing_title>');
  }
  if (input.existingStatement?.trim()) {
    parts.push('<existing_statement>', input.existingStatement.trim().slice(0, 4000), '</existing_statement>');
  }
  if (input.revision?.userFeedback?.trim()) {
    parts.push(
      '<revision_feedback>',
      input.revision.userFeedback.trim(),
      '</revision_feedback>',
    );
  }

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: parts.join('\n') },
  ];
}

export { PROMPT_VERSION as AI_PROBLEM_STATEMENT_PROMPT_VERSION };
