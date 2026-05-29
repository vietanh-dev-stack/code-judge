import {
  findPlaceholderCaseIndexes,
  isLikelyPlaceholderIo,
  problemNeedsFullIo,
} from './ai-testcase-io-quality.util';

describe('ai-testcase-io-quality.util', () => {
  it('detects grid/matrix problems', () => {
    expect(problemNeedsFullIo('In a 100x100 grid find path', '')).toBe(true);
    expect(problemNeedsFullIo('sum array', 'one integer per line')).toBe(false);
  });

  it('flags ellipsis placeholders', () => {
    expect(isLikelyPlaceholderIo('...')).toBe(true);
    expect(isLikelyPlaceholderIo('100x100 grid ...')).toBe(true);
    expect(isLikelyPlaceholderIo('3\n1 2 3\n4 5 6')).toBe(false);
  });

  it('finds bad testcase indexes', () => {
    const indexes = findPlaceholderCaseIndexes([
      { input: '1\n2', expectedOutput: '3', isHidden: false, weight: 1 },
      { input: '...', expectedOutput: 'ok', isHidden: false, weight: 1 },
    ]);
    expect(indexes).toEqual([1]);
  });
});
