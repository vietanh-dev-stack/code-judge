import { Injectable } from '@nestjs/common';
import { Difficulty, ProblemMode, ProblemVisibility, type Problem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminProblemDto } from './dto/create-admin-problem.dto';
import { buildUniqueProblemSlug } from './problem-slug.util';
import { replaceProblemTags } from './problem-tag-sync.util';

@Injectable()
export class AdminProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdminProblemDto, creatorId: string): Promise<Problem> {
    const slug = await buildUniqueProblemSlug(this.prisma.problem, dto.title);
    const supportedLanguages = dto.supportedLanguages ?? [];

    return this.prisma.$transaction(async (tx) => {
      const problem = await tx.problem.create({
        data: {
          title: dto.title,
          description: dto.description ?? null,
          statementMd: dto.statementMd ?? null,
          slug,
          difficulty: dto.difficulty ?? Difficulty.EASY,
          mode: dto.mode ?? ProblemMode.ALGO,
          timeLimitMs: dto.timeLimitMs ?? 1000,
          memoryLimitMb: dto.memoryLimitMb ?? 256,
          isPublished: dto.isPublished ?? true,
          visibility: dto.visibility ?? ProblemVisibility.PUBLIC,
          supportedLanguages: supportedLanguages.length > 0 ? supportedLanguages : undefined,
          maxTestCases: dto.maxTestCases ?? 100,
          creatorId,
        },
      });

      if (dto.testCases && dto.testCases.length > 0) {
        await tx.testCase.createMany({
          data: dto.testCases.map((tc, index) => ({
            problemId: problem.id,
            orderIndex: index + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? false,
            weight: tc.weight ?? 1,
          })),
        });
      }

      if (dto.tagIds !== undefined) {
        await replaceProblemTags(tx, problem.id, dto.tagIds);
      }

      return tx.problem.findUniqueOrThrow({
        where: { id: problem.id },
        include: {
          tags: { include: { tag: true } },
          testCases: { orderBy: { orderIndex: 'asc' } },
        },
      });
    });
  }
}
