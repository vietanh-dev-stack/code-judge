import { sanitizeAiHintOutput } from './ai-hint-filter.util';

const baseHints = {
  summary: 'Có thể sai logic biên.',
  approachHints: ['Kiểm tra mảng rỗng'],
  syntaxNotes: [],
  examplePatterns: [{ title: 'Ví dụ khác', genericExample: 'for x in arr: pass' }],
  encouragement: 'Cố lên!',
};

describe('sanitizeAiHintOutput', () => {
  it('redacts when hint contains public expected output', () => {
    const forbidden = ['42\n'];
    const result = sanitizeAiHintOutput(
      {
        ...baseHints,
        approachHints: ['Kết quả đúng là 42'],
      },
      forbidden,
    );
    expect(result.approachHints[0]).toContain('tự suy luận');
  });

  it('redacts oversized code blocks', () => {
    const longCode = '```\n' + Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n') + '\n```';
    const result = sanitizeAiHintOutput(
      {
        ...baseHints,
        examplePatterns: [{ title: 'Big', genericExample: longCode }],
      },
      [],
    );
    expect(result.examplePatterns[0].genericExample).toContain('tự suy luận');
  });
});
