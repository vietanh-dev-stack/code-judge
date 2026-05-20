import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { CurrentUser, Public, Roles } from '../common';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { ContestsService } from './contests.service';

@ApiTags('contests')
@Controller('contests')
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Public()
  @ApiOperation({ summary: 'Danh sách contest public' })
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('classRoomId') classRoomId?: string,
  ) {
    return this.contestsService.findAll({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      classRoomId,
    });
  }

  @ApiBearerAuth('JWT')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: Danh sách tất cả contest' })
  @Get('admin')
  async findAllAdmin(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contestsService.findAllAdmin({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Public()
  @ApiOperation({ summary: 'Lấy chi tiết contest theo id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contestsService.findById(id);
  }

  @Public()
  @ApiOperation({ summary: 'Lấy bảng xếp hạng contest' })
  @Get(':id/leaderboard')
  async getLeaderboard(@Param('id') id: string) {
    return this.contestsService.getLeaderboard(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Tạo contest mới' })
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateContestDto) {
    return this.contestsService.create(dto, user.userId, user.role === 'ADMIN');
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cập nhật contest' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateContestDto,
  ) {
    return this.contestsService.update(
      id,
      dto,
      user.userId,
      user.role === 'ADMIN',
    );
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Xóa contest' })
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.contestsService.delete(id, user.userId, user.role === 'ADMIN');
  }
}
