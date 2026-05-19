import { apiFetch } from './api-client';

export interface AiHintSyntaxNote {
  area: string;
  note: string;
}

export interface AiHintExamplePattern {
  title: string;
  genericExample: string;
}

export interface AiHintPayload {
  summary: string;
  approachHints: string[];
  syntaxNotes: AiHintSyntaxNote[];
  examplePatterns: AiHintExamplePattern[];
  encouragement: string;
}

export interface RequestHintResult {
  submissionId: string;
  hints: AiHintPayload;
  provider: 'openai' | 'google';
  model: string;
}

export const aiHintApi = {
  requestHint(problemId: string, submissionId: string, language?: string) {
    return apiFetch<RequestHintResult>(`/problems/${problemId}/hint`, {
      method: 'POST',
      body: { submissionId, language },
    });
  },
};
