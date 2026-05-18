import { z } from 'zod';
import { GenerateAiProjectTestcaseDto } from './dto/generate-ai-project-testcase.dto';

/** Phân tích đề bài — bắt buộc trước khi sinh file test. */
export const problemBriefSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  stack: z.enum(['backend', 'frontend', 'fullstack']),
  functionalRequirements: z
    .array(
      z.object({
        id: z.string().regex(/^FR-\d+$/),
        description: z.string().min(1),
        priority: z.enum(['must', 'should', 'could']).default('must'),
      }),
    )
    .min(1),
  apiEndpoints: z.array(z.string()).optional(),
  uiFlows: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
});

export const projectTestManifestItemSchema = z.object({
  testName: z.string().min(1),
  requirementIds: z.array(z.string().min(1)).min(1),
  suite: z.string().min(1),
  filePath: z.string().min(1),
  weight: z.number().int().min(1).max(100).default(1),
  isHidden: z.boolean().default(true),
  rationale: z.string().min(1),
});

export const projectTestFileSchema = z.object({
  path: z.string().min(1),
  content: z.string().min(1),
});

export const projectRunConfigSchema = z.object({
  installCommand: z.string().min(1),
  testCommand: z.string().min(1),
  resultParser: z.enum(['jest-json', 'playwright-json']),
  dockerImage: z.string().min(1).default('node:18-alpine'),
});

export const generatedProjectTestcaseSchema = z.object({
  problemBrief: problemBriefSchema,
  testManifest: z.array(projectTestManifestItemSchema).min(1),
  files: z.array(projectTestFileSchema).min(1),
  runConfig: projectRunConfigSchema,
  notes: z.string().optional(),
  revisionNotes: z.string().optional(),
});

export type GeneratedProjectTestcaseOutput = z.infer<typeof generatedProjectTestcaseSchema>;

export const AI_PROJECT_PROMPT_VERSION_DEFAULT = 'ai-project-testcase-v1';

const SYSTEM_PROMPT = `You are a senior QA engineer and software architect designing hidden automated tests for a programming PROJECT assignment (Node.js backend and/or frontend).

You MUST work in two explicit phases inside ONE JSON response:
1) ANALYZE the problem statement and infer what must be tested (problemBrief).
2) GENERATE runnable hidden test files that verify those requirements (files + testManifest + runConfig).

Return ONLY one valid JSON object. No markdown fences, no prose outside JSON.

Required JSON shape:
{
  "problemBrief": {
    "title": "string",
    "summary": "string (2-4 sentences: what the student must build)",
    "stack": "backend" | "frontend" | "fullstack",
    "functionalRequirements": [
      { "id": "FR-1", "description": "string", "priority": "must" | "should" | "could" }
    ],
    "apiEndpoints": ["optional strings"],
    "uiFlows": ["optional strings"],
    "assumptions": ["string"],
    "outOfScope": ["string"]
  },
  "testManifest": [
    {
      "testName": "stable name for grading report",
      "requirementIds": ["FR-1"],
      "suite": "api | unit | e2e | integration",
      "filePath": "relative/path/from bundle root",
      "weight": 1-100,
      "isHidden": true,
      "rationale": "why this test proves the requirement"
    }
  ],
  "files": [
    { "path": "relative/path", "content": "full file source" }
  ],
  "runConfig": {
    "installCommand": "npm ci",
    "testCommand": "string",
    "resultParser": "jest-json" | "playwright-json",
    "dockerImage": "node:18-alpine"
  },
  "notes": "optional",
  "revisionNotes": "optional"
}

=== PHASE 1 — PROBLEM ANALYSIS (problemBrief) ===
- Read the full statement, rubric, supplementary docs, and golden hints.
- Extract EVERY testable functional requirement as FR-1, FR-2, ... (at least 3 for non-trivial projects).
- If the statement is vague, state minimal assumptions in problemBrief.assumptions — do NOT invent unrelated features.
- apiEndpoints / uiFlows: list only what the statement or golden hint implies.
- outOfScope: list what you deliberately do NOT test (external APIs, styling pixels, etc.).

=== PHASE 2 — RUNNABLE HIDDEN TESTS (files) ===
Tests mount at /app/tests inside Docker; student code mounts at /app (read-write). Student app is ALREADY running or imported by tests as per stack:

BACKEND (Jest/Vitest + supertest):
- Include package.json with test deps (jest, supertest, ts-jest OR vitest per assignment).
- Tests import the student app from ../src or ../app (document assumption in notes).
- Use supertest against Express/Nest app; no real outbound network (mock fetch/axios if needed).
- testCommand example: npm test -- --json --outputFile=result.json
- resultParser: jest-json

FRONTEND (Playwright):
- Include playwright.config.ts targeting student dev server URL from env BASE_URL default http://127.0.0.1:3000
- e2e specs under e2e/ or tests/e2e/
- testCommand example: npm run test:e2e -- --reporter=json
- resultParser: playwright-json

RUNNABILITY RULES (mandatory):
- Every file path is relative, no "..", no absolute paths, no drive letters.
- Every testManifest.filePath MUST exist in files[] with non-empty content.
- Every testManifest.testName MUST appear verbatim in the file content (describe/it/test title).
- Every FR-id in testManifest.requirementIds MUST exist in problemBrief.functionalRequirements.
- At least one test per "must" priority requirement.
- No fs access outside /app; no child_process shell escapes; no network except localhost for e2e.
- Use deterministic assertions (no Date.now without mocking, no random without seed).
- Prefer stable selectors (data-testid) over fragile CSS in e2e.

COVERAGE RULES:
- Cover happy path + at least one failure/edge case per major feature.
- testManifest.length <= max_test_cases from user message.
- Avoid duplicate tests; merge trivial cases.

OUTPUT SIZE:
- Keep individual file content focused; split across multiple spec files if needed.
- Omit long comments; keep JSON valid and complete (do not truncate).
`;

export function buildAiProjectTestcaseMessages(
  input: GenerateAiProjectTestcaseDto,
  promptVersion: string,
) {
  const maxTests = input.maxTestCases ?? 12;
  const stack = input.stack ?? 'backend';
  const framework = input.framework ?? 'not specified';

  const defaultRun =
    stack === 'frontend'
      ? {
          installCommand: 'npm ci',
          testCommand: 'npm run test:e2e -- --reporter=json',
          resultParser: 'playwright-json' as const,
        }
      : {
          installCommand: 'npm ci',
          testCommand: 'npm test -- --json --outputFile=result.json',
          resultParser: 'jest-json' as const,
        };

  const parts: string[] = [
    `<prompt_version>${promptVersion}</prompt_version>`,
    '<assignment_context>',
    `Title: ${input.title}`,
    `Declared stack: ${stack}`,
    `Framework hint: ${framework}`,
    `Difficulty: ${input.difficulty ?? 'not specified'}`,
    '</assignment_context>',
    '',
    '<problem_statement>',
    input.statement,
    '</problem_statement>',
  ];

  if (input.rubric?.trim()) {
    parts.push('', '<rubric>', input.rubric.trim(), '</rubric>');
  }

  if (input.acceptanceCriteria?.length) {
    parts.push(
      '',
      '<acceptance_criteria>',
      input.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n'),
      '</acceptance_criteria>',
    );
  }

  if (input.goldenSummary?.trim()) {
    parts.push(
      '',
      '<golden_solution_hint>',
      'Use this to align imports, routes, and expected behavior. Tests must PASS against a correct golden implementation with this surface:',
      input.goldenSummary.trim(),
      '</golden_solution_hint>',
    );
  }

  if (input.starterTemplateSummary?.trim()) {
    parts.push('', '<starter_template>', input.starterTemplateSummary.trim(), '</starter_template>');
  }

  if (input.supplementaryText?.trim()) {
    parts.push('', '<supplementary_document>', input.supplementaryText.trim(), '</supplementary_document>');
  }

  parts.push(
    '',
    '<generation_constraints>',
    `max_test_cases: ${maxTests}`,
    `target_stack: ${stack}`,
    'Require: complete problemBrief BEFORE files.',
    'Require: every must-have requirement has >= 1 linked test in testManifest.',
    'Require: files form a self-contained test bundle installable via npm ci in /app/tests.',
    '</generation_constraints>',
    '',
    '<suggested_run_config>',
    `installCommand: ${input.installCommand ?? defaultRun.installCommand}`,
    `testCommand: ${input.testCommand ?? defaultRun.testCommand}`,
    `resultParser: ${input.resultParser ?? defaultRun.resultParser}`,
    `dockerImage: ${input.dockerImage ?? 'node:18-alpine'}`,
    '</suggested_run_config>',
  );

  if (input.revision) {
    parts.push(
      '',
      '<previous_attempt_context>',
      `prompt_version_used: ${input.revision.promptVersionUsed ?? 'unknown'}`,
      `summary: ${input.revision.previousOutputSummary ?? 'not provided'}`,
      `validator_issues: ${(input.revision.validatorIssues ?? []).join('; ') || 'none'}`,
      '</previous_attempt_context>',
      '',
      '<user_feedback>',
      input.revision.userFeedback ?? 'Fix validator issues; keep valid tests; improve requirement coverage.',
      '</user_feedback>',
      '',
      '<revision_instructions>',
      '- Re-analyze problemBrief if requirements were wrong or incomplete.',
      '- Fix only broken paths, missing FR links, or non-runnable test code.',
      '- Return the full JSON object (not a diff).',
      '</revision_instructions>',
    );
  }

  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: parts.join('\n') },
  ];
}
