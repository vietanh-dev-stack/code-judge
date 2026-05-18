import { z } from 'zod';

export const projectTestFileLineBlockSchema = z.object({
  lineStart: z.number().int().min(1),
  lineEnd: z.number().int().min(1),
  label: z.string().min(1),
  responsibility: z.string().min(1),
  relatedRequirementIds: z.array(z.string()).optional(),
});

export const projectTestFileTestExplainSchema = z.object({
  testName: z.string().min(1),
  lineStart: z.number().int().min(1).optional(),
  lineEnd: z.number().int().min(1).optional(),
  validates: z.string().min(1),
  expectedBehavior: z.string().optional(),
});

export const projectTestFileExplanationSchema = z.object({
  filePurpose: z.string().min(1),
  studentCodeInteraction: z.string().min(1),
  lineBlocks: z.array(projectTestFileLineBlockSchema).min(1),
  testBreakdown: z.array(projectTestFileTestExplainSchema).default([]),
  reviewChecklist: z.array(z.string()).default([]),
});

export type ProjectTestFileExplanation = z.infer<typeof projectTestFileExplanationSchema>;

const SYSTEM_PROMPT = `You explain hidden autograder test source files to Vietnamese instructors.
Return ONLY one valid JSON object (no markdown fences).

Schema:
{
  "filePurpose": "string — one paragraph: why this file exists in the bundle",
  "studentCodeInteraction": "string — how tests read/mount student app under /app",
  "lineBlocks": [
    {
      "lineStart": 1,
      "lineEnd": 15,
      "label": "short title e.g. Import dependencies",
      "responsibility": "what this line range does, in Vietnamese",
      "relatedRequirementIds": ["FR-1"]
    }
  ],
  "testBreakdown": [
    {
      "testName": "exact test name from manifest",
      "lineStart": 20,
      "lineEnd": 45,
      "validates": "what assertion/scenario proves",
      "expectedBehavior": "pass/fail expectation"
    }
  ],
  "reviewChecklist": ["bullet for instructor review"]
}

Rules:
- lineStart/lineEnd MUST refer to real line numbers in the provided source (1-based).
- Cover the full file: contiguous lineBlocks should span from line 1 to last line without large gaps.
- lineBlocks must not overlap; sort by lineStart.
- Each test in related_tests_manifest should appear in testBreakdown when possible.
- Be specific: mention imports, describe/it blocks, mocks, supertest calls, expect() — tied to line ranges.
- Vietnamese for all human-readable strings.
- Do NOT return a single unstructured essay; use lineBlocks + testBreakdown.`;

export function buildExplainProjectTestFileMessages(input: {
  filePath: string;
  fileContent: string;
  problemSummary?: string;
  relatedTestsJson?: string;
}) {
  const numberedSource = input.fileContent
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')}| ${line}`)
    .join('\n');

  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: [
        `<file_path>${input.filePath}</file_path>`,
        '<problem_summary>',
        input.problemSummary?.trim() || 'Không cung cấp',
        '</problem_summary>',
        '<related_tests_manifest>',
        input.relatedTestsJson?.trim() || '[]',
        '</related_tests_manifest>',
        '<file_source_with_line_numbers>',
        numberedSource,
        '</file_source_with_line_numbers>',
        `<total_lines>${input.fileContent.split('\n').length}</total_lines>`,
      ].join('\n'),
    },
  ];
}

export function validateLineBlocksAgainstSource(
  explanation: ProjectTestFileExplanation,
  totalLines: number,
): string[] {
  const issues: string[] = [];
  for (const block of explanation.lineBlocks) {
    if (block.lineEnd < block.lineStart) {
      issues.push(`Block "${block.label}": lineEnd < lineStart`);
    }
    if (block.lineStart > totalLines || block.lineEnd > totalLines) {
      issues.push(`Block "${block.label}": line range exceeds file (${totalLines} lines)`);
    }
  }
  return issues;
}
