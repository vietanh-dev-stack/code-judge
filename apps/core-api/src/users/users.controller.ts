import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { AvatarConfirmDto } from './dto/avatar-confirm.dto';
import { AvatarUploadDto } from './dto/avatar-upload.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserStatsService } from './user-stats.service';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly userStats: UserStatsService,
  ) {}

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo user mới' })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách user (paging + search)' })
  @Get()
  findAll(@Query() query: ListUsersDto) {
    return this.users.findAll(query);
  }

  @ApiOperation({
    summary:
      'Tìm user để mời lớp (ADMIN hoặc chủ lớp/OWNER — bắt buộc classRoomId trừ ADMIN)',
  })
  @Get('search')
  searchUsers(
    @CurrentUser() user: RequestUser,
    @Query('q') q: string,
    @Query('classRoomId') classRoomId?: string,
  ) {
    return this.users.searchByEmail(q, user, classRoomId);
  }

  @ApiOperation({ summary: 'Lấy thông tin user hiện tại' })
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.users.findPublicById(user.userId);
  }

  @ApiOperation({ summary: 'Thống kê profile của user hiện tại' })
  @Get('me/stats')
  myStats(@CurrentUser() user: RequestUser) {
    return this.userStats.getMyStats(user.userId);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin user hiện tại' })
  @Patch('me')
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.userId, dto);
  }

  @ApiOperation({ summary: 'Lấy presigned URL upload avatar của user hiện tại' })
  @Post('me/avatar/upload-url')
  createAvatarUploadUrl(@CurrentUser() user: RequestUser, @Body() dto: AvatarUploadDto) {
    return this.users.createAvatarUploadUrl(user.userId, dto);
  }

  @ApiOperation({ summary: 'Xác nhận avatar object key của user hiện tại' })
  @Post('me/avatar/confirm')
  confirmAvatarUpload(@CurrentUser() user: RequestUser, @Body() dto: AvatarConfirmDto) {
    return this.users.confirmAvatarObjectKey(user.userId, dto.objectKey);
  }

  @ApiOperation({ summary: 'Vô hiệu hóa tài khoản của chính mình' })
  @Delete('me')
  deactivateMe(@CurrentUser() user: RequestUser) {
    return this.users.deactivateMe(user.userId);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy user theo id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật user theo id' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật role user',
  })
  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.users.updateRole(id, dto.role);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Khoá / mở khoá tài khoản',
  })
  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @Body() dto: ToggleStatusDto) {
    return this.users.toggleStatus(id, dto.isActive);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Soft delete user',
  })
  @Delete(':id')
  remove(@CurrentUser() currentUser: RequestUser, @Param('id') id: string) {
    return this.users.remove(currentUser.userId, id);
  }
}
