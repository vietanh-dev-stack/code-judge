import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClassroomService } from './classroom.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { JoinClassroomDto } from './dto/join-classroom.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('classroom')
@ApiBearerAuth('JWT')
@Controller('classroom')
export class ClassroomController {
  constructor(private readonly service: ClassroomService) {}

  // CREATE
  @Post()
  create(@Body() dto: CreateClassroomDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.userId);
  }

  // GET MY CLASSES
  @Get('me')
  getMyClasses(@CurrentUser() user: any) {
    return this.service.getMyClasses(user.userId);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: danh sách lớp (chọn lớp khi tạo problem)' })
  @Get('admin/all')
  listAllForAdmin(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listAllForAdmin({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // GET DETAIL
  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getDetail(id, user.userId);
  }

  @Get(':id/people')
  getPeople(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getPeople(id, user.userId);
  }

  // UPDATE
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassroomDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.userId);
  }

  // ARCHIVE
  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.archive(id, user.userId);
  }

  // RESTORE
  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.restore(id, user.userId);
  }

  // JOIN
  @Post('join')
  join(@Body() dto: JoinClassroomDto, @CurrentUser() user: any) {
    return this.service.join(dto, user.userId);
  }

  // REMOVE MEMBER
  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.removeMember(id, userId, user.userId);
  }
}
