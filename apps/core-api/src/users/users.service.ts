import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { ProblemAccessService } from '../problems/problem-access.service';
import { randomBytes } from 'crypto';
import { formatPagedList, hashPassword, validatePasswordPolicy } from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { buildAvatarObjectKey } from '../storage/storage-key.builder';
import { StorageService } from '../storage/storage.service';
import { AvatarUploadDto } from './dto/avatar-upload.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PUBLIC_USER_WITH_AVATAR_KEY_SELECT,
  type PublicUser,
  type UserWithAvatarKey,
} from './user-public.select';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly problemAccess: ProblemAccessService,
  ) {}

  private async toPublicUser(row: UserWithAvatarKey): Promise<PublicUser> {
    const image = await this.storage.resolveAvatarImageUrl(row.imageObjectKey, row.image);
    const { imageObjectKey: _key, ...rest } = row;
    return { ...rest, image };
  }

  private async ensureNotLastAdmin(userId: string) {
    const user = await this.findById(userId);

    // Không phải admin -> bỏ qua
    if (user.role !== Role.ADMIN) {
      return;
    }

    const totalAdmins = await this.prisma.user.count({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
    });

    if (totalAdmins <= 1) {
      throw new BadRequestException('Không thể thay đổi admin cuối cùng của hệ thống');
    }
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email đã được sử dụng');

    const id = dto.id ?? randomBytes(12).toString('hex');
    if (dto.password) {
      validatePasswordPolicy(dto.password);
    }
    const passwordHash = dto.password ? await hashPassword(dto.password) : null;
    const created = await this.prisma.user.create({
      data: {
        id,
        name: dto.name,
        email: dto.email,
        role: dto.role ?? Role.CLIENT,
        passwordHash,
        isActive: true,
        emailVerified: true,
      },
      select: PUBLIC_USER_WITH_AVATAR_KEY_SELECT,
    });
    return this.toPublicUser(created);
  }

  async findAll(query: ListUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return formatPagedList(items, total, page, limit);
  }

  async findById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  async findPublicById(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_WITH_AVATAR_KEY_SELECT,
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return this.toPublicUser(user);
  }

  async deactivateMe(userId: string): Promise<{ success: boolean }> {
    await this.findById(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return { success: true };
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<PublicUser> {
    await this.findById(userId);

    if (dto.name === undefined) {
      return this.findPublicById(userId);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: PUBLIC_USER_WITH_AVATAR_KEY_SELECT,
    });
    return this.toPublicUser(updated);
  }

  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);

    const data: Partial<
      UpdateUserDto & {
        emailVerified?: boolean;
      }
    > = {
      ...dto,
    };

    // Email changed
    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (exists) {
        throw new ConflictException('Email đã được sử dụng');
      }

      // Require verify again
      data.emailVerified = false;
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });
  }

  async remove(currentUserId: string, targetUserId: string): Promise<{ success: boolean }> {
    // Không cho tự xoá chính mình
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('Bạn không thể tự xoá chính mình');
    }

    // Không cho xoá admin cuối cùng
    await this.ensureNotLastAdmin(targetUserId);

    await this.findById(targetUserId);

    await this.prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
    };
  }

  async updateRole(targetUserId: string, role: Role): Promise<User> {
    const user = await this.findById(targetUserId);

    // Không cho downgrade admin cuối cùng
    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      await this.ensureNotLastAdmin(targetUserId);
    }

    return this.prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        role,
      },
    });
  }

  async toggleStatus(targetUserId: string, isActive: boolean): Promise<User> {
    const user = await this.findById(targetUserId);

    // Không cho disable admin cuối cùng
    if (user.role === Role.ADMIN && !isActive) {
      await this.ensureNotLastAdmin(targetUserId);
    }

    return this.prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        isActive,
      },
    });
  }

  async createAvatarUploadUrl(userId: string, dto: AvatarUploadDto) {
    await this.findById(userId);
    const objectKey = buildAvatarObjectKey(userId, dto.extension ?? 'bin');
    const uploadUrl = await this.storage.createPresignedUploadUrl({
      objectKey,
      expiresInSeconds: 900,
    });
    return {
      objectKey,
      uploadUrl,
      bucket: this.storage.getBucketName(),
    };
  }

  async confirmAvatarObjectKey(userId: string, objectKey: string): Promise<PublicUser> {
    await this.findById(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        image: null,
        imageObjectKey: objectKey,
      },
      select: PUBLIC_USER_WITH_AVATAR_KEY_SELECT,
    });
    return this.toPublicUser(updated);
  }

  async searchByEmail(q: string, requester: RequestUser, classRoomId?: string) {
    const query = q.trim();

    if (!query) return [];

    if (query.length < 3) {
      throw new BadRequestException('Search query must be at least 3 characters');
    }

    if (requester.role !== Role.ADMIN) {
      const classId = classRoomId?.trim();
      if (!classId) {
        throw new ForbiddenException('classRoomId is required to search users');
      }
      await this.problemAccess.assertCanListClassProblems(classId, {
        userId: requester.userId,
        role: requester.role,
      });
    }

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,

        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              startsWith: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        imageObjectKey: true,
      },
      take: 10,
    });

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
    const canSuggestExternal =
      requester.role === Role.ADMIN ||
      (Boolean(classRoomId?.trim()) &&
        (await this.problemAccess.userIsClassManager(classRoomId!.trim(), requester.userId)));
    if (isEmail && canSuggestExternal && !users.find((u) => u.email === query)) {
      users.push({
        id: `external-${query}`,
        email: query,
        name: query,
        image: null,
        imageObjectKey: null,
      });
    }

    return Promise.all(
      users.map(async (u) => {
        const image = await this.storage.resolveAvatarImageUrl(u.imageObjectKey, u.image);
        const { imageObjectKey: _key, ...rest } = u;
        return { ...rest, image };
      }),
    );
  }
}
