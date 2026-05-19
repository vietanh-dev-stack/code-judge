import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { AiHintService } from './ai-hint.service';
import { RequestHintDto } from './dto/request-hint.dto';

@ApiTags('problems')
@Controller('problems')
export class AiHintController {
  constructor(private readonly aiHintService: AiHintService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Gợi ý AI sau Run/Submit thất bại (Socratic, không lộ đáp án)',
  })
  @Post(':problemId/hint')
  async requestHint(
    @Param('problemId') problemId: string,
    @Body() dto: RequestHintDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.aiHintService.requestHint(problemId, dto, user, req);
  }
}
