import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { slugifyTagName } from './tag-slug.util';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, createdAt: true },
    });
  }

  async create(dto: CreateTagDto) {
    let slug = (dto.slug?.trim() || slugifyTagName(dto.name)).toLowerCase();
    const exists = await this.prisma.tag.findUnique({ where: { slug } });
    if (exists) {
      throw new ConflictException(`Tag với slug "${slug}" đã tồn tại`);
    }
    return this.prisma.tag.create({
      data: {
        name: dto.name.trim(),
        slug,
      },
      select: { id: true, name: true, slug: true, createdAt: true },
    });
  }
}
