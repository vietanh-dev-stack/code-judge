import { BadRequestException } from '@nestjs/common';
import { resolveProblemTagIds } from './problem-tag-sync.util';

describe('resolveProblemTagIds', () => {
  const tx = {
    tag: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves by id (including legacy seed ids) and slug', async () => {
    tx.tag.findMany.mockResolvedValue([
      { id: 'seed-tag-basic', slug: 'basic' },
      { id: 'a1111111-1111-4111-8111-111111111102', slug: 'math' },
    ]);

    const result = await resolveProblemTagIds(tx as never, [
      'seed-tag-basic',
      'math',
      'seed-tag-basic',
    ]);

    expect(result).toEqual(['seed-tag-basic', 'a1111111-1111-4111-8111-111111111102']);
    expect(tx.tag.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ id: { in: ['seed-tag-basic', 'math'] } }, { slug: { in: ['seed-tag-basic', 'math'] } }],
      },
      select: { id: true, slug: true },
    });
  });

  it('throws when a tag identifier is unknown', async () => {
    tx.tag.findMany.mockResolvedValue([{ id: 'seed-tag-basic', slug: 'basic' }]);

    await expect(resolveProblemTagIds(tx as never, ['basic', 'missing'])).rejects.toThrow(
      BadRequestException,
    );
  });
});
