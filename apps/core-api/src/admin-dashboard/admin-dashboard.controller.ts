import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('admin-dashboard')
@ApiBearerAuth('JWT')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy dữ liệu phân tích hệ thống (overview analytics)' })
  @Get('analytics')
  getAnalytics() {
    return this.dashboardService.getAnalytics();
  }
}
