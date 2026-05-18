import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * Thay thế toàn bộ liên kết ProblemTag theo danh sách tagId (UUID).
 * `tagIds` rỗng = gỡ hết tag khỏi problem.
 */
export async function replaceProblemTags(
  tx: Prisma.TransactionClient,
  problemId: string,
  tagIds: string[],
): Promise<void> {
  const unique = [...new Set(tagIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length > 0) {
    const found = await tx.tag.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException('tagIds: một hoặc nhiều tag không tồn tại');
    }
  }
  await tx.problemTag.deleteMany({ where: { problemId } });
  if (unique.length > 0) {
    await tx.problemTag.createMany({
      data: unique.map((tagId) => ({ problemId, tagId })),
    });
  }
}
