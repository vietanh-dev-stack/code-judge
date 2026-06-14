import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ClientErrorsService } from './client-errors.service';
import { ReportClientErrorDto } from './dto/report-client-error.dto';

/**
 * Endpoint nhận lỗi frontend (JS errors, React errors, network failures…).
 *
 * Đánh dấu `@Public()` vì lỗi có thể xảy ra trước khi user đăng nhập.
 * Nếu user đã đăng nhập, `request.user` có thể chứa thông tin từ JWT
 * (nếu JWT guard vẫn parse cookie mà không reject).
 */
@ApiTags('client-errors')
@Controller('client-errors')
export class ClientErrorsController {
  constructor(private readonly clientErrorsService: ClientErrorsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Nhận báo cáo lỗi từ frontend (batch)' })
  reportErrors(
    @Body() dto: ReportClientErrorDto,
    @Req() req: Request,
  ): void {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown';

    // Rate-limit check — silently drop if exceeded to avoid giving attackers feedback.
    if (!this.clientErrorsService.checkRateLimit(ip)) {
      return;
    }

    // Extract userId if JWT guard has populated request.user (optional).
    const userId = (req as unknown as { user?: { userId?: string } }).user?.userId;

    this.clientErrorsService.processBatch(dto.errors, { ip, userId });
  }
}
