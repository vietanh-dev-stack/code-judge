import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * Chuẩn hóa mỗi phần tử `tagIds` thành UUID tag trong DB.
 * Chấp nhận id tag (UUID hoặc id legacy từ seed) hoặc slug.
 */
export async function resolveProblemTagIds(
  tx: Prisma.TransactionClient,
  identifiers: string[],
): Promise<string[]> {
  const unique = [...new Set(identifiers.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const tags = await tx.tag.findMany({
    where: {
      OR: [{ id: { in: unique } }, { slug: { in: unique } }],
    },
    select: { id: true, slug: true },
  });

  const idByKey = new Map<string, string>();
  for (const t of tags) {
    idByKey.set(t.id, t.id);
    idByKey.set(t.slug, t.id);
  }

  const resolved: string[] = [];
  const missing: string[] = [];
  for (const key of unique) {
    const id = idByKey.get(key);
    if (!id) {
      missing.push(key);
      continue;
    }
    if (!resolved.includes(id)) resolved.push(id);
  }

  if (missing.length > 0) {
    throw new BadRequestException(
      `tagIds: một hoặc nhiều tag không tồn tại (${missing.join(', ')})`,
    );
  }

  return resolved;
}

/**
 * Thay thế toàn bộ liên kết ProblemTag theo danh sách tagId.
 * `tagIds` rỗng = gỡ hết tag khỏi problem.
 */
export async function replaceProblemTags(
  tx: Prisma.TransactionClient,
  problemId: string,
  tagIds: string[],
): Promise<void> {
  const unique = await resolveProblemTagIds(tx, tagIds);
  await tx.problemTag.deleteMany({ where: { problemId } });
  if (unique.length > 0) {
    await tx.problemTag.createMany({
      data: unique.map((tagId) => ({ problemId, tagId })),
    });
  }
}
