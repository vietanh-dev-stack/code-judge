import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateClassInviteDto } from './dto/create-class-invite.dto';
import { generateInviteToken } from './utils/generate-invite-token';
import { hashToken } from './utils/hash-token';
import { MailerService } from '../mail/mail.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  // INVITE USER
  async inviteToClass(classRoomId: string, dto: CreateClassInviteDto, userId: string) {
    const classroom = await this.prisma.classRoom.findUnique({
      where: { id: classRoomId },
    });

    if (!classroom || !classroom.isActive) {
      throw new NotFoundException('Classroom not found');
    }

    if (classroom.ownerId !== userId) {
      throw new ForbiddenException('Only owner can invite');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      const enrollment = await this.prisma.classEnrollment.findUnique({
        where: {
          classRoomId_userId: {
            classRoomId,
            userId: existingUser.id,
          },
        },
      });

      if (enrollment?.status === 'ACTIVE') {
        throw new BadRequestException('User already in classroom');
      }
    }

    const token = generateInviteToken();
    const tokenHash = hashToken(token);

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const invite = await this.prisma.classInvite.create({
      data: {
        classRoomId,
        invitedById: userId,
        email: dto.email,
        tokenHash,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.FRONTEND_URL}/invites/accept?token=${token}`;

    await this.mailer.sendInviteMail({
      to: dto.email,
      classroomName: classroom.name,
      inviterName: 'Class Owner',
      inviteUrl,
    });

    return {
      message: 'Invitation sent',
      inviteId: invite.id,
    };
  }

  // ACCEPT INVITE
  async acceptInvite(token: string, userId: string) {
    const tokenHash = hashToken(token);

    const invite = await this.prisma.classInvite.findUnique({
      where: { tokenHash },
      include: { classRoom: true },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Invite already used');
    }

    if (!invite.classRoom.isActive) {
      throw new ForbiddenException('This classroom is archived and cannot be joined.');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invite.email) {
      throw new ForbiddenException('Invalid user for this invite');
    }

    const existing = await this.prisma.classEnrollment.findUnique({
      where: {
        classRoomId_userId: {
          classRoomId: invite.classRoomId,
          userId,
        },
      },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new BadRequestException('You are already enrolled in this class');
      }
      if (existing.status === 'BLOCKED') {
        throw new ForbiddenException('You have been blocked from this class');
      }

      // Re-activate enrollment
      await this.prisma.classEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
    } else {
      await this.prisma.classEnrollment.create({
        data: {
          classRoomId: invite.classRoomId,
          userId,
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
    }

    await this.prisma.classInvite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    return {
      message: 'Joined classroom successfully',
      classRoomId: invite.classRoomId,
    };
  }
}