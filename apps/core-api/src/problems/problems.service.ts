import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Difficulty, ProblemMode, ProblemVisibility, Prisma, Problem, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { buildUniqueProblemSlug } from './problem-slug.util';
import { ProblemVisibilityService } from './problem-visibility.service';

import { MailerService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

const PROBLEM_LIST_INCLUDE = {
  tags: { include: { tag: true } },
} as const;

const PROBLEM_DETAIL_INCLUDE = {
  testCases: { orderBy: { orderIndex: 'asc' as const } },
  assignments: true,
  tags: { include: { tag: true } },
} as const;

@Injectable()
export class ProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly visibilityService: ProblemVisibilityService,
  ) {}

  async create(dto: CreateProblemDto, creatorId: string, role?: Role): Promise<Problem> {
    const classRoomId = dto.classRoomId?.trim();
    if (!classRoomId) {
      throw new BadRequestException('classRoomId is required');
    }
    await this.ensureUserCanCreateProblemInClass(classRoomId, creatorId, role);
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
          visibility: this.visibilityService.getVisibilityForCreate(dto, classRoomId),
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

      // Create ClassAssignment automatically
      const assignment = await tx.classAssignment.create({
        data: {
          classRoomId,
          title: problem.title,
          description: problem.description,
          problemId: problem.id,
          publishedAt: new Date(),
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        },
        include: {
          classRoom: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE', role: 'MEMBER' },
                include: { user: { select: { email: true } } },
              },
            },
          },
        },
      });

      // Send email notification (async)
      const memberEmails = assignment.classRoom.enrollments
        .map((e: any) => e.user.email)
        .filter((email: string | null): email is string => !!email);

      console.log(`[ProblemsService] Found ${memberEmails.length} members to notify for problem "${problem.title}" in class "${assignment.classRoom.name}"`);

      if (memberEmails.length > 0) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
        this.mailerService
          .sendAssignmentNotification({
            to: memberEmails,
            classroomName: assignment.classRoom.name,
            type: 'problem',
            title: problem.title,
            description: problem.description ?? undefined,
            dueAt: dto.dueAt ? new Date(dto.dueAt).toLocaleString() : undefined,
            url: `${frontendUrl}/dashboard/${classRoomId}/classwork`,
          })
          .catch((err) => console.error('[ProblemsService] Failed to send assignment notification emails:', err));
      }

      return problem;
    });
  }

  async findAll(query: {
    search?: string;
    page?: number;
    limit?: number;
    classRoomId?: string;
    difficulty?: string;
    mode?: string;
  }) {
    const { page, limit, skip } = this.normalizeListPagination(query.page, query.limit);
    const search = query.search?.trim();
    const difficultyFilter =
      query.difficulty === 'EASY' || query.difficulty === 'MEDIUM' || query.difficulty === 'HARD'
        ? { difficulty: query.difficulty as Difficulty }
        : {};
    const modeFilter =
      query.mode === 'ALGO' || query.mode === 'PROJECT' ? { mode: query.mode as ProblemMode } : {};

    // If classRoomId is provided (class context), show all problems including PRIVATE
    // Otherwise (public bank), only show PUBLIC problems
    const visibilityFilter = query.classRoomId
      ? {} // No visibility filter for class context
      : this.visibilityService.getPublicProblemBankVisibilityFilter(); // visibility: PUBLIC for public bank

    const where: Prisma.ProblemWhereInput = {
      isPublished: true,
      ...visibilityFilter,
      ...difficultyFilter,
      ...modeFilter,
      ...(query.classRoomId ? { assignments: { some: { classRoomId: query.classRoomId } } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.problem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PROBLEM_LIST_INCLUDE,
      }),
      this.prisma.problem.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findAllAdmin(query: { search?: string; page?: number; limit?: number }) {
    const { page, limit, skip } = this.normalizeListPagination(query.page, query.limit);
    const search = query.search?.trim();
    const where: Prisma.ProblemWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.problem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PROBLEM_LIST_INCLUDE,
      }),
      this.prisma.problem.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findById(problemId: string, req?: any) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      include: PROBLEM_DETAIL_INCLUDE,
    });
    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    // Check if the user is authorized to view raw, unsanitized test cases (admin/creator/teacher)
    let isAuthorized = false;
    if (req) {
      const token = req.cookies?.accessToken;
      if (token) {
        try {
          const decoded: any = jwt.decode(token);
          if (decoded && decoded.sub) {
            const userId = decoded.sub;
            const role = decoded.role;
            isAuthorized = await this.canManageProblem(problem, userId, role);
          }
        } catch (err) {
          // Token decode fail, treat as unauthorized (student)
        }
      }
    }

    if (!isAuthorized && problem.testCases) {
      // Sanitize hidden test cases for students/guests!
      problem.testCases = problem.testCases.map((tc) => {
        if (tc.isHidden) {
          return {
            ...tc,
            input: '',
            expectedOutput: '',
          };
        }
        return tc;
      });
    }

    return problem;
  }

  async update(problemId: string, dto: UpdateProblemDto, updaterId: string, role?: Role) {
    const existing = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        slug: true,
        creatorId: true,
        visibility: true,
        assignments: { select: { classRoomId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Problem not found');
    }

    if (!(await this.canManageProblem(existing, updaterId, role))) {
      throw new ForbiddenException('Only creator, class owner, or admin can update this problem');
    }

    const slug =
      dto.title && dto.title !== existing.title
        ? await buildUniqueProblemSlug(this.prisma.problem, dto.title)
        : existing.slug;

    // Enforce visibility rules for class problems
    const classRoomIds = existing.assignments.map((a) => a.classRoomId);
    const enforcedVisibility = this.visibilityService.getVisibilityForUpdate(
      existing.visibility as ProblemVisibility,
      dto.visibility as ProblemVisibility | undefined,
      classRoomIds,
      role,
    );

    return this.prisma.$transaction(async (tx) => {
      const data: any = {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.statementMd !== undefined ? { statementMd: dto.statementMd } : {}),
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
        ...(dto.timeLimitMs !== undefined ? { timeLimitMs: dto.timeLimitMs } : {}),
        ...(dto.memoryLimitMb !== undefined ? { memoryLimitMb: dto.memoryLimitMb } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(dto.visibility !== undefined ? { visibility: enforcedVisibility } : {}),
        ...(dto.supportedLanguages !== undefined
          ? { supportedLanguages: dto.supportedLanguages }
          : {}),
        ...(dto.maxTestCases !== undefined ? { maxTestCases: dto.maxTestCases } : {}),
        slug,
      };

      const updatedProblem = await tx.problem.update({
        where: { id: problemId },
        data,
      });

      if (dto.testCases) {
        await tx.testCase.deleteMany({ where: { problemId } });
        if (dto.testCases.length > 0) {
          await tx.testCase.createMany({
            data: dto.testCases.map((tc, index) => ({
              problemId,
              orderIndex: index + 1,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden ?? false,
              weight: tc.weight ?? 1,
            })),
          });
        }
      }

      // Sync ClassAssignment details if changed
      if (dto.title !== undefined || dto.description !== undefined || dto.dueAt !== undefined) {
        await tx.classAssignment.updateMany({
          where: { problemId },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
          },
        });
      }

      return updatedProblem;
    });
  }

  async delete(problemId: string, userId: string, role?: Role) {
    const existing = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        slug: true,
        creatorId: true,
        assignments: { select: { classRoomId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Problem not found');
    }

    if (!(await this.canManageProblem(existing, userId, role))) {
      throw new ForbiddenException('Only creator, class owner, or admin can delete this problem');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.contestProblem.deleteMany({ where: { problemId } });
      await tx.classAssignment.deleteMany({ where: { problemId } });
      return tx.problem.delete({ where: { id: problemId } });
    });
  }

  private async ensureUserCanCreateProblemInClass(
    classRoomId: string,
    userId: string,
    role?: Role,
  ): Promise<void> {
    if (role === Role.ADMIN) {
      await this.ensureClassExists(classRoomId);
      return;
    }

    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { id: true, ownerId: true, isActive: true },
    });

    if (!classRoom) {
      throw new NotFoundException('Class not found');
    }

    if (!classRoom.isActive) {
      throw new ForbiddenException('Classroom is archived and new assignments cannot be added.');
    }

    if (classRoom.ownerId === userId) {
      return;
    }

    const asOwnerEnrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        classRoomId,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    if (!asOwnerEnrollment) {
      throw new ForbiddenException('Only the class owner can create problems for this class');
    }
  }

  /** Admin, creator, hoặc chủ lớp (ownerId / enrollment OWNER) của một lớp đang gán bài. */
  private async canManageProblem(
    existing: {
      creatorId: string | null;
      assignments: { classRoomId: string }[];
    },
    userId: string,
    role?: Role,
  ): Promise<boolean> {
    if (role === Role.ADMIN) {
      return true;
    }
    if (existing.creatorId === userId) {
      return true;
    }
    for (const a of existing.assignments) {
      if (await this.userIsClassOwnerForRoom(a.classRoomId, userId)) {
        return true;
      }
    }
    return false;
  }

  private async userIsClassOwnerForRoom(classRoomId: string, userId: string): Promise<boolean> {
    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { ownerId: true, isActive: true },
    });
    if (!classRoom) {
      return false;
    }

    // Nếu lớp học đã bị lưu trữ, không cho phép owner chỉnh sửa nữa
    if (!classRoom.isActive) {
      return false;
    }

    if (classRoom.ownerId === userId) {
      return true;
    }
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        classRoomId,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    return Boolean(enrollment);
  }

  private async ensureClassExists(classRoomId: string) {
    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { id: true },
    });

    if (!classRoom) {
      throw new NotFoundException('Class not found');
    }

    return classRoom;
  }

  /** page ≥ 1, limit trong [1, maxLimit], mặc định page=1, limit=20. */
  private normalizeListPagination(page?: number, limit?: number, maxLimit = 100) {
    const p = Number.isFinite(page) && (page as number) > 0 ? Math.floor(page as number) : 1;
    const rawL = Number.isFinite(limit) && (limit as number) > 0 ? Math.floor(limit as number) : 20;
    const l = Math.min(Math.max(1, rawL), maxLimit);
    return { page: p, limit: l, skip: (p - 1) * l };
  }
}
