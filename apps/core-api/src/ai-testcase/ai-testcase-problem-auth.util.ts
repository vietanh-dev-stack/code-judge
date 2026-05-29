import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import type { PrismaService } from '../prisma/prisma.service';

export async function assertUserCanManageProblemAiForProblemId(
  prisma: PrismaService,
  problemId: string,
  user: RequestUser,
): Promise<void> {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { id: true, creatorId: true },
  });
  if (!problem) {
    throw new NotFoundException('Problem không tồn tại');
  }
  if (user.role === Role.ADMIN) {
    return;
  }
  if (problem.creatorId === null || problem.creatorId === user.userId) {
    return;
  }
  throw new ForbiddenException('Chỉ chủ đề (creator) hoặc admin mới chạy thao tác AI trên problem này');
}

export async function assertCanUseInlineGoldenDraft(
  user: RequestUser,
  problemId: string | undefined,
  prisma: PrismaService,
): Promise<void> {
  if (problemId) {
    await assertUserCanManageProblemAiForProblemId(prisma, problemId, user);
    return;
  }
  if (user.role === Role.ADMIN || user.role === Role.CLIENT) {
    return;
  }
  throw new ForbiddenException(
    'goldenSourceCode: cần đăng nhập (ADMIN/CLIENT) hoặc kèm problemId để dán mã golden',
  );
}

export async function assertCanAnalyzeGoldenVerifyFailures(
  user: RequestUser,
  problemId: string | undefined,
  prisma: PrismaService,
): Promise<void> {
  if (problemId) {
    await assertUserCanManageProblemAiForProblemId(prisma, problemId, user);
    return;
  }
  if (user.role === Role.ADMIN || user.role === Role.CLIENT) {
    return;
  }
  throw new ForbiddenException('Cần đăng nhập (ADMIN/CLIENT) hoặc problemId để phân tích lỗi verify');
}
