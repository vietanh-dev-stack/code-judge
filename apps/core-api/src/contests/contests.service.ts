import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from '../common';
import { ContestStatus, ContestTestFeedbackPolicy, Prisma, Contest } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';

import { MailerService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateContestDto, creatorId: string, isAdmin = false) {
    if (dto.classRoomId) {
      await this.ensureClassOwner(dto.classRoomId, creatorId);
    } else if (!isAdmin) {
      throw new ForbiddenException('Only Admin can create global contests');
    }

    const problems = dto.problems ?? [];
    const problemIds = problems.map((item) => item.problemId);
    if (problemIds.length > 0) {
      const existingProblems = await this.prisma.problem.findMany({
        where: { id: { in: problemIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingProblems.map((item) => item.id));
      const missing = problemIds.filter((id) => !existingIds.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(`Problem không tồn tại: ${missing.join(', ')}`);
      }
    }

    const now = new Date();
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const status = determineContestStatus(startAt, endAt, now);
    const passwordHash = dto.password ? await hashPassword(dto.password) : null;

    return this.prisma.$transaction(async (tx) => {
      const contest = await tx.contest.create({
        data: {
          title: dto.title,
          description: dto.description ?? null,
          slug: buildContestSlug(dto.title),
          passwordHash,
          startAt,
          endAt,
          status,
          testFeedbackPolicy: dto.testFeedbackPolicy ?? ContestTestFeedbackPolicy.SUMMARY_ONLY,
          maxSubmissionsPerProblem: dto.maxSubmissionsPerProblem ?? null,
          createdById: creatorId,
          problems: {
            create: problems.map((problem, index) => ({
              problemId: problem.problemId,
              orderIndex: problem.orderIndex ?? index,
              points: problem.points ?? 100,
              timeLimitMsOverride: problem.timeLimitMsOverride ?? null,
              memoryLimitMbOverride: problem.memoryLimitMbOverride ?? null,
            })),
          },
        },
      });

      if (dto.classRoomId) {
        const assignment = await tx.classAssignment.create({
          data: {
            classRoomId: dto.classRoomId,
            title: contest.title,
            description: contest.description,
            contestId: contest.id,
            publishedAt: new Date(),
            dueAt: new Date(dto.endAt),
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

        if (memberEmails.length > 0) {
          const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
          this.mailerService
            .sendAssignmentNotification({
              to: memberEmails,
              classroomName: assignment.classRoom.name,
              type: 'contest',
              title: contest.title,
              description: contest.description ?? undefined,
              dueAt: new Date(dto.endAt).toLocaleString(),
              url: `${frontendUrl}/dashboard/${dto.classRoomId}/contests`,
            })
            .catch((err) => console.error('Failed to send contest notification emails', err));
        }
      }

      return contest;
    });
  }

  async findAll(query: { search?: string; page?: number; limit?: number; classRoomId?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.ContestWhereInput = query.classRoomId
      ? {
          assignments: {
            some: { classRoomId: query.classRoomId },
          },
        }
      : {
          status: { not: 'DRAFT' },
          assignments: { none: {} }, // Chỉ lấy contest KHÔNG thuộc classroom nào
        };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.contest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'desc' },
        include: { problems: true },
      }),
      this.prisma.contest.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findAllAdmin(query: { search?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.ContestWhereInput = {
      // Only show contests without class assignments (admin-created contests)
      assignments: { none: {} },
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.contest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { name: true, email: true } },
          problems: true,
        },
      }),
      this.prisma.contest.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findById(contestId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        problems: { include: { problem: true } },
        assignments: true,
      },
    });
    if (!contest) {
      throw new NotFoundException('Contest không tồn tại');
    }
    const { passwordHash, ...result } = contest;
    return result;
  }

  async update(contestId: string, dto: UpdateContestDto, updaterId: string, isAdmin = false) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        problems: true,
        assignments: {
          include: { classRoom: { select: { isActive: true } } },
        },
      },
    });
    if (!contest) {
      throw new NotFoundException('Contest không tồn tại');
    }

    if (contest.createdById !== updaterId && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền cập nhật cuộc thi này');
    }

    // Check if any associated classroom is archived
    const hasArchivedClass = contest.assignments.some((a) => !a.classRoom.isActive);
    if (hasArchivedClass && !isAdmin) {
      throw new ForbiddenException(
        'This contest belongs to an archived classroom and cannot be edited.',
      );
    }

    if (dto.problems && dto.problems.length > 0) {
      const problemIds = dto.problems
        .map((item) => item.problemId)
        .filter((id): id is string => Boolean(id));
      const existingProblems = await this.prisma.problem.findMany({
        where: { id: { in: problemIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingProblems.map((item) => item.id));
      const missing = problemIds.filter((id) => !existingIds.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(`Problem không tồn tại: ${missing.join(', ')}`);
      }
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : contest.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : contest.endAt;
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const status = determineContestStatus(startAt, endAt, new Date());
    const passwordHash = dto.password ? await hashPassword(dto.password) : contest.passwordHash;

    return this.prisma.$transaction(async (tx) => {
      const updatedContest = await tx.contest.update({
        where: { id: contestId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.startAt !== undefined ? { startAt } : {}),
          ...(dto.endAt !== undefined ? { endAt } : {}),
          ...(dto.testFeedbackPolicy !== undefined
            ? { testFeedbackPolicy: dto.testFeedbackPolicy }
            : {}),
          ...(dto.maxSubmissionsPerProblem !== undefined
            ? { maxSubmissionsPerProblem: dto.maxSubmissionsPerProblem }
            : {}),
          ...(dto.password !== undefined ? { passwordHash } : {}),
          status,
        },
      });

      if (dto.problems) {
        await tx.contestProblem.deleteMany({ where: { contestId } });
        if (dto.problems.length > 0) {
          await tx.contestProblem.createMany({
            data: dto.problems.map((item, index) => ({
              contestId,
              problemId: item.problemId!,
              orderIndex: item.orderIndex ?? index,
              points: item.points ?? 100,
              timeLimitMsOverride: item.timeLimitMsOverride ?? null,
              memoryLimitMbOverride: item.memoryLimitMbOverride ?? null,
            })),
          });
        }
      }

      if (dto.title !== undefined || dto.description !== undefined || dto.endAt !== undefined) {
        await tx.classAssignment.updateMany({
          where: { contestId },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.endAt !== undefined ? { dueAt: new Date(dto.endAt) } : {}),
          },
        });
      }

      return updatedContest;
    });
  }

  async delete(contestId: string, userId: string, isAdmin = false) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        createdById: true,
        assignments: {
          include: { classRoom: { select: { isActive: true } } },
        },
      },
    });
    if (!contest) {
      throw new NotFoundException('Contest không tồn tại');
    }
    if (contest.createdById !== userId && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xóa cuộc thi này');
    }

    const hasArchivedClass = contest.assignments.some((a) => !a.classRoom.isActive);
    if (hasArchivedClass && !isAdmin) {
      throw new ForbiddenException(
        'This contest belongs to an archived classroom and cannot be deleted.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.classAssignment.deleteMany({ where: { contestId } });
      return tx.contest.delete({ where: { id: contestId } });
    });
  }

  async getLeaderboard(contestId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        problems: {
          orderBy: { orderIndex: 'asc' },
          include: { problem: true },
        },
        participants: {
          include: { user: true },
        },
      },
    });

    if (!contest) {
      throw new NotFoundException('Contest không tồn tại');
    }

    const submissions = await this.prisma.submission.findMany({
      where: { contestId, isDryRun: false },
      orderBy: { createdAt: 'asc' },
    });

    const contestStartTime = contest.startAt.getTime();
    const PENALTY_PER_FAILED = 20 * 60 * 1000;

    // Lấy tất cả userId duy nhất từ submissions và participants
    const submissionUserIds = [...new Set(submissions.map((s) => s.userId))];
    const participantUserIds = contest.participants.map((p) => p.userId);
    const allUserIds = [...new Set([...submissionUserIds, ...participantUserIds])];

    // Fetch thông tin user cho những người nộp bài nhưng không phải participant
    const missingUserIds = submissionUserIds.filter((id) => !participantUserIds.includes(id));
    const missingUsers =
      missingUserIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: missingUserIds } },
            select: { id: true, name: true, image: true },
          })
        : [];

    const userMap = new Map<string, { name: string; image: string | null }>();
    contest.participants.forEach((p) =>
      userMap.set(p.userId, { name: p.user.name, image: p.user.image }),
    );
    missingUsers.forEach((u) => userMap.set(u.id, { name: u.name || 'Unknown', image: u.image }));

    const leaderboard = allUserIds.map((userId) => {
      const user = userMap.get(userId)!;
      const userSubmissions = submissions.filter((s) => s.userId === userId);
      const problemStats = contest.problems.map((cp) => {
        const problemSubmissions = userSubmissions.filter((s) => s.problemId === cp.problemId);
        const acceptedSubmission = problemSubmissions.find((s) => s.status === 'Accepted');

        const isPending = problemSubmissions.some(
          (s) => s.status === 'Pending' || s.status === 'Running',
        );

        let penalty = 0;
        let solvedAt = null;
        let attempts = 0;

        if (acceptedSubmission) {
          solvedAt = acceptedSubmission.createdAt.getTime();
          const failedSubmissions = problemSubmissions.filter(
            (s) => s.status !== 'Accepted' && s.createdAt < acceptedSubmission.createdAt && s.status !== 'Pending' && s.status !== 'Running',
          );
          attempts = failedSubmissions.length + 1;
          penalty = solvedAt - contestStartTime + failedSubmissions.length * PENALTY_PER_FAILED;
        } else {
          const gradedSubmissions = problemSubmissions.filter(
            (s) => s.status !== 'Pending' && s.status !== 'Running',
          );
          attempts = gradedSubmissions.length;
        }

        return {
          problemId: cp.problemId,
          problemTitle: cp.problem.title,
          isSolved: !!acceptedSubmission,
          isPending,
          points: acceptedSubmission ? cp.points : 0,
          penalty: acceptedSubmission ? penalty : 0,
          solvedAt: solvedAt ? new Date(solvedAt) : null,
          attempts,
        };
      });

      const totalScore = problemStats.reduce((sum, p) => sum + p.points, 0);
      const totalPenalty = problemStats.reduce((sum, p) => sum + p.penalty, 0);
      const solvedCount = problemStats.filter((p) => p.isSolved).length;

      return {
        userId,
        userName: user.name,
        userAvatar: user.image,
        solvedCount,
        totalScore,
        totalPenalty,
        problems: problemStats,
      };
    });

    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.totalPenalty - b.totalPenalty;
    });

    return {
      contest: {
        id: contest.id,
        title: contest.title,
        startAt: contest.startAt,
        endAt: contest.endAt,
      },
      leaderboard,
    };
  }

  private async ensureClassOwner(classRoomId: string, userId: string) {
    const classRoom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { ownerId: true, isActive: true },
    });

    if (!classRoom) {
      throw new NotFoundException('Class not found');
    }

    if (classRoom.ownerId !== userId) {
      throw new ForbiddenException('Only owner can do this action');
    }

    if (!classRoom.isActive) {
      throw new ForbiddenException('Classroom is archived and this action is not allowed.');
    }

    return classRoom;
  }
}

function determineContestStatus(startAt: Date, endAt: Date, now: Date): ContestStatus {
  if (endAt <= now) return ContestStatus.ENDED;
  if (startAt <= now && endAt > now) return ContestStatus.RUNNING;
  return ContestStatus.PUBLISHED;
}

function buildContestSlug(value: string): string {
  const raw = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw.length > 0 ? raw : `contest-${Math.random().toString(36).slice(2, 10)}`;
}
