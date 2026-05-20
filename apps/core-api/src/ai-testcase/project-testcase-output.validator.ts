import type { GeneratedProjectTestcaseOutput } from './ai-project-testcase.prompt';

const UNSAFE_PATH = /(^\/|\\|[a-zA-Z]:|\.\.(\/|\\|$))/;

export type ProjectTestcaseValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type ProjectTestcaseValidationResult = {
  valid: boolean;
  issues: ProjectTestcaseValidationIssue[];
};

/**
 * Kiểm tra tĩnh output AI PROJECT: bám đề bài (FR), file tồn tại, tên test trong source, an toàn path.
 */
export function validateGeneratedProjectTestcase(
  output: GeneratedProjectTestcaseOutput,
  options: { maxTestCases: number },
): ProjectTestcaseValidationResult {
  const issues: ProjectTestcaseValidationIssue[] = [];
  const frIds = new Set(output.problemBrief.functionalRequirements.map((fr) => fr.id));
  const filePaths = new Map(output.files.map((f) => [normalizePath(f.path), f.content]));

  if (output.testManifest.length > options.maxTestCases) {
    issues.push({
      code: 'MANIFEST_COUNT',
      message: `testManifest has ${output.testManifest.length} items; max is ${options.maxTestCases}`,
    });
  }

  const mustRequirements = output.problemBrief.functionalRequirements.filter(
    (fr) => fr.priority === 'must',
  );
  const coveredMust = new Set<string>();
  for (const item of output.testManifest) {
    for (const rid of item.requirementIds) {
      if (mustRequirements.some((fr) => fr.id === rid)) {
        coveredMust.add(rid);
      }
    }
  }
  for (const fr of mustRequirements) {
    if (!coveredMust.has(fr.id)) {
      issues.push({
        code: 'UNCOVERED_MUST',
        message: `Requirement ${fr.id} (must) has no test in testManifest`,
        path: `problemBrief.functionalRequirements.${fr.id}`,
      });
    }
  }

  for (const file of output.files) {
    const path = normalizePath(file.path);
    if (UNSAFE_PATH.test(path)) {
      issues.push({
        code: 'UNSAFE_PATH',
        message: `Unsafe file path: ${file.path}`,
        path: file.path,
      });
    }
    if (!file.content.trim()) {
      issues.push({
        code: 'EMPTY_FILE',
        message: `File content is empty: ${file.path}`,
        path: file.path,
      });
    }
  }

  const hasPackageJson = [...filePaths.keys()].some((p) => p === 'package.json');
  if (!hasPackageJson) {
    issues.push({
      code: 'MISSING_PACKAGE_JSON',
      message: 'files must include package.json for npm ci in hidden test bundle',
    });
  }

  const stack = output.problemBrief.stack;
  const hasSpec = [...filePaths.keys()].some(
    (p) => p.includes('.spec.') || p.includes('.test.') || p.startsWith('e2e/'),
  );
  if (!hasSpec) {
    issues.push({
      code: 'MISSING_TEST_FILES',
      message: 'files must include at least one *.spec.* / *.test.* or e2e/*.ts file',
    });
  }

  if (stack === 'frontend' || stack === 'fullstack') {
    const hasPlaywright =
      [...filePaths.keys()].some((p) => p.includes('playwright')) ||
      output.runConfig.resultParser === 'playwright-json';
    if (!hasPlaywright) {
      issues.push({
        code: 'FRONTEND_PLAYWRIGHT',
        message: 'frontend/fullstack stack should include playwright config or playwright-json parser',
      });
    }
  }

  if (
    stack === 'backend' &&
    output.runConfig.resultParser !== 'jest-json'
  ) {
    issues.push({
      code: 'BACKEND_PARSER',
      message: 'backend-only stack should use resultParser jest-json',
    });
  }

  for (const item of output.testManifest) {
    const fp = normalizePath(item.filePath);
    if (UNSAFE_PATH.test(fp)) {
      issues.push({
        code: 'UNSAFE_MANIFEST_PATH',
        message: `Unsafe manifest filePath: ${item.filePath}`,
        path: item.filePath,
      });
    }
    const content = filePaths.get(fp);
    if (!content) {
      issues.push({
        code: 'MANIFEST_FILE_MISSING',
        message: `testManifest references missing file: ${item.filePath}`,
        path: item.filePath,
      });
      continue;
    }
    for (const rid of item.requirementIds) {
      if (!frIds.has(rid)) {
        issues.push({
          code: 'UNKNOWN_REQUIREMENT_ID',
          message: `test "${item.testName}" references unknown ${rid}`,
          path: item.filePath,
        });
      }
    }
    if (!contentIncludesTestName(content, item.testName)) {
      issues.push({
        code: 'TEST_NAME_NOT_IN_FILE',
        message: `testName "${item.testName}" not found in ${item.filePath} source`,
        path: item.filePath,
      });
    }
  }

  if (!output.problemBrief.summary.trim()) {
    issues.push({ code: 'EMPTY_SUMMARY', message: 'problemBrief.summary is required' });
  }

  if (output.problemBrief.title.trim().length < 2) {
    issues.push({ code: 'SHORT_TITLE', message: 'problemBrief.title is too short' });
  }

  return { valid: issues.length === 0, issues };
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '').trim();
}

function contentIncludesTestName(content: string, testName: string): boolean {
  const escaped = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`['\`]${escaped}['\`]`),
    new RegExp(`test\\s*\\(\\s*['\`]${escaped}['\`]`),
    new RegExp(`it\\s*\\(\\s*['\`]${escaped}['\`]`),
    new RegExp(`describe\\s*\\(\\s*['\`]${escaped}['\`]`),
  ];
  if (patterns.some((re) => re.test(content))) {
    return true;
  }
  return content.includes(testName);
}
