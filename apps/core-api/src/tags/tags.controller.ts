import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public, Roles } from '../common';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Public()
  @ApiOperation({ summary: 'Danh sách tag (dùng cho form gán đề)' })
  @Get()
  findAll() {
    return this.tags.findAll();
  }

  @ApiBearerAuth('JWT')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo tag mới (ADMIN)' })
  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.tags.create(dto);
  }
}
