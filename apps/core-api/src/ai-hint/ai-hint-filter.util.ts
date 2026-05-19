import type { AiHintOutput } from './ai-hint.prompt';

const REDACTED = 'Hãy thử tự suy luận phần này — tránh copy đáp án trực tiếp.';
const MAX_CODE_LINES_PER_FIELD = 12;

function countCodeLines(text: string): number {
  const fenceMatches = text.match(/```[\s\S]*?```/g);
  if (fenceMatches?.length) {
    return fenceMatches.reduce((sum, block) => sum + block.split('\n').length, 0);
  }
  return text.split('\n').length;
}

function normalizeForMatch(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function leaksExpectedOutput(text: string, forbiddenOutputs: string[]): boolean {
  const normalized = normalizeForMatch(text);
  if (!normalized) return false;
  for (const expected of forbiddenOutputs) {
    const normExpected = normalizeForMatch(expected);
    if (normExpected.length >= 4 && normalized.includes(normExpected)) {
      return true;
    }
  }
  return false;
}

function sanitizeTextField(text: string, forbiddenOutputs: string[]): string {
  let out = text;
  if (countCodeLines(out) > MAX_CODE_LINES_PER_FIELD) {
    out = REDACTED;
  }
  if (leaksExpectedOutput(out, forbiddenOutputs)) {
    out = REDACTED;
  }
  return out;
}

/** Post-filter model output to reduce answer leakage and oversized code blocks. */
export function sanitizeAiHintOutput(
  hints: AiHintOutput,
  forbiddenExpectedOutputs: string[],
): AiHintOutput {
  return {
    summary: sanitizeTextField(hints.summary, forbiddenExpectedOutputs),
    approachHints: hints.approachHints.map((h) =>
      sanitizeTextField(h, forbiddenExpectedOutputs),
    ),
    syntaxNotes: hints.syntaxNotes.map((n) => ({
      area: sanitizeTextField(n.area, forbiddenExpectedOutputs),
      note: sanitizeTextField(n.note, forbiddenExpectedOutputs),
    })),
    examplePatterns: hints.examplePatterns.map((e) => ({
      title: sanitizeTextField(e.title, forbiddenExpectedOutputs),
      genericExample: sanitizeTextField(e.genericExample, forbiddenExpectedOutputs),
    })),
    encouragement: sanitizeTextField(hints.encouragement, forbiddenExpectedOutputs),
  };
}
