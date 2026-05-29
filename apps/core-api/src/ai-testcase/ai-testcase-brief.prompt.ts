import { z } from 'zod';

export const testgenBriefSchema = z.object({
  ioSummary: z.string().min(1),
  constraints: z.array(z.string()).default([]),
  publicExamples: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
        note: z.string().optional(),
      }),
    )
    .default([]),
  pitfalls: z.array(z.string()).default([]),
});

export type TestgenBrief = z.infer<typeof testgenBriefSchema>;

const BRIEF_SYSTEM = `You extract a compact testcase-generation brief from a long programming problem.
Return ONLY one valid JSON object (no markdown fences).

Schema:
{
  "ioSummary": "one paragraph: exact stdin/stdout format",
  "constraints": ["numeric bounds, special rules"],
  "publicExamples": [{ "input": "...", "output": "...", "note": "optional" }],
  "pitfalls": ["common student mistakes to test"]
}

Rules:
- Focus on what an automated judge needs: input layout, output layout, whitespace rules.
- publicExamples: at most 3 samples from the statement (not hidden tests).
- Vietnamese if the statement is Vietnamese; English if English.
- Do NOT invent tests — only extract from the given statement and io_spec.`;

export function buildTestgenBriefMessages(input: {
  title: string;
  statement: string;
  ioSpec?: string;
}) {
  return [
    { role: 'system' as const, content: BRIEF_SYSTEM },
    {
      role: 'user' as const,
      content: [
        `<title>${input.title}</title>`,
        '<io_spec>',
        input.ioSpec?.trim() || 'UNKNOWN',
        '</io_spec>',
        '<full_statement>',
        input.statement,
        '</full_statement>',
      ].join('\n'),
    },
  ];
}
