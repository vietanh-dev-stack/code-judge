import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { JoinClassroomDto } from './dto/join-classroom.dto';
import { generateClassCode } from './utils/generate-class-code';

@Injectable()
export class ClassroomService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE CLASSROOM
  async create(dto: CreateClassroomDto, userId: string) {
    // generate unique class code
    let classCode = generateClassCode();

    let exists = await this.prisma.classRoom.findUnique({
      where: { classCode },
    });

    while (exists) {
      classCode = generateClassCode();
      exists = await this.prisma.classRoom.findUnique({
        where: { classCode },
      });
    }

    // create classroom
    const classroom = await this.prisma.classRoom.create({
      data: {
        name: dto.name,
        description: dto.description,
        academicYear: dto.academicYear,
        classCode,
        ownerId: userId,
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // auto enroll owner
    await this.prisma.classEnrollment.create({
      data: {
        classRoomId: classroom.id,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    return classroom;
  }

  async listAllForAdmin(query: { search?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where = search
      ? {
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { classCode: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { isActive: true };

    const [items, total] = await Promise.all([
      this.prisma.classRoom.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          classCode: true,
          academicYear: true,
          ownerId: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.classRoom.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  // GET MY CLASSES
  async getMyClasses(userId: string) {
    return this.prisma.classEnrollment.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        joinedAt: 'desc',
      },
      select: {
        role: true,
        classRoom: {
          select: {
            id: true,
            ownerId: true,
            name: true,
            academicYear: true,
            classCode: true,
            isActive: true,
            createdAt: true,
            owner: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            assignments: {
              include: {
                problem: true,
                contest: true,
              },
            },
          },
        },
      },
    });
  }

  // GET CLASS DETAIL
  async getDetail(classRoomId: string, userId: string) {
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        classRoomId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not in this class');
    }

    return this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      include: {
        owner: true,
        enrollments: {
          include: { user: true },
        },
        assignments: {
          include: {
            problem: true,
            contest: true,
          },
          orderBy: {
            publishedAt: 'desc',
          },
        },
      },
    });
  }

  async getPeople(classRoomId: string, userId: string) {
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        classRoomId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not in this class');
    }

    const classroom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
      include: {
        owner: true,
        enrollments: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            user: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('Class not found');
    }

    const teachers = classroom.enrollments.filter((e) => e.role === 'OWNER').map((e) => e.user);

    const students = classroom.enrollments.filter((e) => e.role === 'MEMBER').map((e) => e.user);

    return {
      ownerId: classroom.ownerId,
      teachers,
      students,
    };
  }

  // UPDATE CLASSROOM (OWNER ONLY)
  async update(classRoomId: string, dto: UpdateClassroomDto, userId: string) {
    const classroom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
    });

    if (!classroom) {
      throw new NotFoundException('Class not found');
    }

    if (classroom.ownerId !== userId) {
      throw new ForbiddenException('Only owner can update');
    }

    if (!classroom.isActive) {
      throw new ForbiddenException('Classroom is archived and cannot be edited.');
    }

    return this.prisma.classRoom.update({
      where: { id: classRoomId },
      data: dto,
    });
  }

  // ARCHIVE CLASSROOM (OWNER ONLY)
  async archive(classRoomId: string, userId: string) {
    const classroom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
    });

    if (!classroom) {
      throw new NotFoundException('Class not found');
    }

    if (classroom.ownerId !== userId) {
      throw new ForbiddenException('Only owner can archive');
    }

    return this.prisma.classRoom.update({
      where: { id: classRoomId },
      data: {
        isActive: false,
      },
    });
  }

  // RESTORE CLASSROOM (OWNER ONLY)
  async restore(classRoomId: string, userId: string) {
    const classroom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
    });

    if (!classroom) {
      throw new NotFoundException('Class not found');
    }

    if (classroom.ownerId !== userId) {
      throw new ForbiddenException('Only owner can restore');
    }

    return this.prisma.classRoom.update({
      where: { id: classRoomId },
      data: {
        isActive: true,
      },
    });
  }

  // JOIN CLASSROOM
  async join(dto: JoinClassroomDto, userId: string) {
    const classroom = await this.prisma.classRoom.findUnique({
      where: { classCode: dto.classCode },
    });

    if (!classroom || !classroom.isActive) {
      throw new NotFoundException('Class not found');
    }

    const existing = await this.prisma.classEnrollment.findUnique({
      where: {
        classRoomId_userId: {
          classRoomId: classroom.id,
          userId,
        },
      },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new BadRequestException('You have already enrolled in this class.');
      }

      // If they were removed or left, reactivate them? Or throw error?
      // For now, let's just reactivate if they were removed/left, or throw if blocked
      if (existing.status === 'BLOCKED') {
        throw new ForbiddenException('You have been blocked from this class.');
      }

      return this.prisma.classEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
    }

    return this.prisma.classEnrollment.create({
      data: {
        classRoomId: classroom.id,
        userId,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });
  }

  // REMOVE MEMBER
  async removeMember(classRoomId: string, targetUserId: string, ownerId: string) {
    const classroom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
    });

    if (!classroom) {
      throw new NotFoundException('Class not found');
    }

    if (classroom.ownerId !== ownerId) {
      throw new ForbiddenException('Only owner can remove members');
    }

    if (!classroom.isActive) {
      throw new ForbiddenException('Classroom is archived and members cannot be removed.');
    }

    if (targetUserId === ownerId) {
      throw new ForbiddenException('Owner cannot remove themselves');
    }

    return this.prisma.classEnrollment.update({
      where: {
        classRoomId_userId: {
          classRoomId,
          userId: targetUserId,
        },
      },
      data: {
        status: 'REMOVED',
      },
    });
  }
}
