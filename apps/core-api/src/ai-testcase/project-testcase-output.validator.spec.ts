import { validateGeneratedProjectTestcase } from './project-testcase-output.validator';
import type { GeneratedProjectTestcaseOutput } from './ai-project-testcase.prompt';

function minimalOutput(overrides?: Partial<GeneratedProjectTestcaseOutput>): GeneratedProjectTestcaseOutput {
  return {
    problemBrief: {
      title: 'Demo API',
      summary: 'Build a REST API for books.',
      stack: 'backend',
      functionalRequirements: [
        { id: 'FR-1', description: 'List books', priority: 'must' },
        { id: 'FR-2', description: 'Create book', priority: 'must' },
      ],
      assumptions: [],
      outOfScope: [],
    },
    testManifest: [
      {
        testName: 'lists books',
        requirementIds: ['FR-1'],
        suite: 'api',
        filePath: 'tests/api/books.spec.ts',
        weight: 1,
        isHidden: true,
        rationale: 'covers list endpoint',
      },
      {
        testName: 'creates book',
        requirementIds: ['FR-2'],
        suite: 'api',
        filePath: 'tests/api/books.spec.ts',
        weight: 1,
        isHidden: true,
        rationale: 'covers create endpoint',
      },
    ],
    files: [
      {
        path: 'package.json',
        content: '{"name":"hidden-tests","scripts":{"test":"jest"}}',
      },
      {
        path: 'tests/api/books.spec.ts',
        content: `describe('books', () => {
  it('lists books', () => expect(true).toBe(true));
  it('creates book', () => expect(true).toBe(true));
});`,
      },
    ],
    runConfig: {
      installCommand: 'npm ci',
      testCommand: 'npm test -- --json --outputFile=result.json',
      resultParser: 'jest-json',
      dockerImage: 'node:18-alpine',
    },
    ...overrides,
  };
}

describe('validateGeneratedProjectTestcase', () => {
  it('accepts minimal valid bundle', () => {
    const result = validateGeneratedProjectTestcase(minimalOutput(), { maxTestCases: 10 });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects missing must requirement coverage', () => {
    const output = minimalOutput();
    output.testManifest = output.testManifest.filter((t) => !t.requirementIds.includes('FR-2'));
    const result = validateGeneratedProjectTestcase(output, { maxTestCases: 10 });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'UNCOVERED_MUST')).toBe(true);
  });

  it('rejects testName not present in file', () => {
    const output = minimalOutput();
    output.testManifest[0].testName = 'nonexistent test title';
    const result = validateGeneratedProjectTestcase(output, { maxTestCases: 10 });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'TEST_NAME_NOT_IN_FILE')).toBe(true);
  });
});
