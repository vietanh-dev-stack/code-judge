/**
 * Core API `/ai-testcase` — verify draft test cases against a golden solution.
 */

import { apiFetch } from './api-client';

export type VerifyGoldenVerdict =
  | 'OK'
  | 'WRONG_ANSWER'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT'
  | 'PYTHON_NOT_FOUND';

export interface VerifyTestcasesWithGoldenResult {
  language: string;
  goldenSource: 'inline' | 'database';
  goldenSolutionId?: string;
  summary: { total: number; passed: number; failed: number };
  results: Array<{
    index: number;
    passed: boolean;
    expectedOutput: string;
    actualOutput?: string;
    stderr?: string;
    verdict: VerifyGoldenVerdict;
  }>;
}

export interface VerifyTestcasesWithGoldenBody {
  problemId?: string;
  goldenSolutionId?: string;
  goldenSourceCode?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  usePersistedTestCases?: boolean;
  language?: string;
  timeLimitMsPerCase?: number;
}

export type ProjectTestcaseSampleKey = 'backend' | 'frontend' | 'fullstack';

export interface GenerateAiProjectTestcaseBody {
  title: string;
  statement: string;
  stack?: 'backend' | 'frontend' | 'fullstack';
  framework?: string;
  difficulty?: string;
  maxTestCases?: number;
  rubric?: string;
  acceptanceCriteria?: string[];
  goldenSummary?: string;
  starterTemplateSummary?: string;
  supplementaryText?: string;
  installCommand?: string;
  testCommand?: string;
  resultParser?: 'jest-json' | 'playwright-json';
  dockerImage?: string;
  provider?: 'openai' | 'google';
  model?: string;
}

export interface ProjectTestManifestItem {
  testName: string;
  requirementIds: string[];
  suite: string;
  filePath: string;
  weight: number;
  isHidden: boolean;
  rationale: string;
}

export interface ProjectTestFile {
  path: string;
  content: string;
}

export interface GeneratedProjectTestcaseParsed {
  problemBrief: {
    title: string;
    summary: string;
    stack: 'backend' | 'frontend' | 'fullstack';
    functionalRequirements: Array<{
      id: string;
      description: string;
      priority: 'must' | 'should' | 'could';
    }>;
    apiEndpoints?: string[];
    uiFlows?: string[];
    assumptions: string[];
    outOfScope: string[];
  };
  testManifest: ProjectTestManifestItem[];
  files: ProjectTestFile[];
  runConfig: {
    installCommand: string;
    testCommand: string;
    resultParser: 'jest-json' | 'playwright-json';
    dockerImage: string;
  };
  notes?: string;
}

export interface GenerateProjectDraftResult {
  provider: string;
  model: string;
  promptVersion: string;
  raw: string;
  parsed: GeneratedProjectTestcaseParsed | null;
  parseError?: string;
  validation?: {
    valid: boolean;
    issues: Array<{ code: string; message: string; path?: string }>;
  };
}

export interface ProjectTestcaseSampleListResult {
  keys: ProjectTestcaseSampleKey[];
  samples: Array<{
    key: ProjectTestcaseSampleKey;
    label: string;
    description: string;
    dto: GenerateAiProjectTestcaseBody;
  }>;
}

export interface ProjectTestFileLineBlock {
  lineStart: number;
  lineEnd: number;
  label: string;
  responsibility: string;
  relatedRequirementIds?: string[];
}

export interface ProjectTestFileTestExplain {
  testName: string;
  lineStart?: number;
  lineEnd?: number;
  validates: string;
  expectedBehavior?: string;
}

export interface ProjectTestFileExplanation {
  filePurpose: string;
  studentCodeInteraction: string;
  lineBlocks: ProjectTestFileLineBlock[];
  testBreakdown: ProjectTestFileTestExplain[];
  reviewChecklist: string[];
}

export interface ExplainProjectTestFileResult {
  filePath: string;
  provider: string;
  model: string;
  structured: ProjectTestFileExplanation | null;
  parseError?: string;
  explanation?: string;
}

export type GoldenVerifyRootCause =
  | 'wrong_expected'
  | 'wrong_input'
  | 'io_format_mismatch'
  | 'golden_runtime'
  | 'time_limit'
  | 'statement_ambiguous'
  | 'other';

export interface GoldenVerifySuggestedFix {
  input?: string;
  expectedOutput?: string;
}

export interface GoldenVerifyCaseDiagnosis {
  index: number;
  verdict: string;
  rootCause: GoldenVerifyRootCause;
  explanation: string;
  suggestedFix?: GoldenVerifySuggestedFix;
  confidence: 'high' | 'medium' | 'low';
}

export interface GoldenVerifyFailureDiagnosis {
  summary: string;
  caseDiagnoses: GoldenVerifyCaseDiagnosis[];
  globalNotes?: string;
}

/** Payload lồng verifyResult — khớp DTO backend (chỉ summary + results). */
export type AnalyzeGoldenVerifyResultPayload = Pick<
  VerifyTestcasesWithGoldenResult,
  'summary' | 'results'
>;

export interface AnalyzeGoldenVerifyFailuresBody {
  problemId?: string;
  title?: string;
  statement?: string;
  ioSpec?: string;
  language: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
  verifyResult: VerifyTestcasesWithGoldenResult;
  provider?: 'openai' | 'google';
  model?: string;
  goldenSnippet?: string;
}

export function toAnalyzeGoldenVerifyPayload(
  result: VerifyTestcasesWithGoldenResult,
): AnalyzeGoldenVerifyResultPayload {
  return {
    summary: result.summary,
    results: result.results,
  };
}

export interface AnalyzeGoldenVerifyFailuresResult {
  provider: 'openai' | 'google';
  model: string;
  structured: GoldenVerifyFailureDiagnosis | null;
  parseError?: string;
  rawPreview?: string;
}

export interface TestGenerateProjectSampleResult {
  mode: 'single' | 'all';
  results: Array<{
    sample: ProjectTestcaseSampleKey;
    label: string;
    ok: boolean;
    provider: string;
    model: string;
    promptVersion: string;
    parseError?: string;
    validation?: GenerateProjectDraftResult['validation'];
    problemBrief?: GeneratedProjectTestcaseParsed['problemBrief'];
    testCount?: number;
    fileCount?: number;
    rawPreview?: string;
  }>;
}

export const aiTestcaseApi = {
  async verifyTestcasesWithGolden(
    body: VerifyTestcasesWithGoldenBody,
    options?: RequestInit,
  ): Promise<VerifyTestcasesWithGoldenResult> {
    return apiFetch('/ai-testcase/verify-testcases-with-golden', {
      ...options,
      method: 'POST',
      body,
    });
  },

  async analyzeGoldenVerifyFailures(
    body: AnalyzeGoldenVerifyFailuresBody,
    options?: RequestInit,
  ): Promise<AnalyzeGoldenVerifyFailuresResult> {
    return apiFetch('/ai-testcase/analyze-golden-verify-failures', {
      ...options,
      method: 'POST',
      body: {
        ...body,
        verifyResult: toAnalyzeGoldenVerifyPayload(body.verifyResult),
      },
    });
  },

  async listProjectTestcaseSamples(): Promise<ProjectTestcaseSampleListResult> {
    return apiFetch('/ai-testcase/project-testcase-samples', { method: 'GET' });
  },

  async generateProjectDraft(body: GenerateAiProjectTestcaseBody): Promise<GenerateProjectDraftResult> {
    return apiFetch('/ai-testcase/generate-project-draft', {
      method: 'POST',
      body,
    });
  },

  async testGenerateProjectSample(body: {
    sample?: ProjectTestcaseSampleKey;
    provider?: 'openai' | 'google';
    model?: string;
  }): Promise<TestGenerateProjectSampleResult> {
    return apiFetch('/ai-testcase/test-generate-project-sample', {
      method: 'POST',
      body,
    });
  },

  async explainProjectTestFile(body: {
    filePath: string;
    fileContent: string;
    problemSummary?: string;
    relatedTestsJson?: string;
    provider?: 'openai' | 'google';
    model?: string;
  }): Promise<ExplainProjectTestFileResult> {
    return apiFetch('/ai-testcase/explain-project-test-file', {
      method: 'POST',
      body,
    });
  },
};
