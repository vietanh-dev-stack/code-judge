import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { buildUniqueTagSlug, slugifyTagName } from './tag-slug.util';

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
    const slugSource = dto.slug?.trim() ? dto.slug : dto.name;
    const baseSlug = slugifyTagName(slugSource).toLowerCase();
    const slug = await buildUniqueTagSlug(this.prisma.tag, baseSlug);

    return this.prisma.tag.create({
      data: {
        name: dto.name.trim(),
        slug,
      },
      select: { id: true, name: true, slug: true, createdAt: true },
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag với id "${id}" không tồn tại`);
    }

    let slug = tag.slug;
    if (dto.name && !dto.slug) {
      slug = slugifyTagName(dto.name).toLowerCase();
    } else if (dto.slug) {
      slug = slugifyTagName(dto.slug).toLowerCase();
    }

    if (slug !== tag.slug) {
      // Make it unique instead of failing create/update due to @unique constraint.
      slug = await buildUniqueTagSlug(this.prisma.tag, slug);
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? tag.name,
        slug,
      },
      select: { id: true, name: true, slug: true, createdAt: true },
    });
  }

  async delete(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag với id "${id}" không tồn tại`);
    }
    await this.prisma.tag.delete({ where: { id } });
  }
}
