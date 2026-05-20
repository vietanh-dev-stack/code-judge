import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common';
import type { RequestUser } from '../common/interfaces/request-user.interface';
import { ConfirmGoldenUploadDto } from './dto/confirm-golden-upload.dto';
import { PresignUploadGoldenDto } from './dto/presign-upload-golden.dto';
import { GoldenSolutionsService } from './golden-solutions.service';

@ApiTags('golden-solutions')
@ApiBearerAuth('JWT')
@Controller()
export class GoldenSolutionsController {
  constructor(private readonly goldenSolutions: GoldenSolutionsService) {}

  @ApiOperation({
    summary: 'Tạo golden solution + presigned PUT để upload mã nguồn lên MinIO',
    description:
      'Chỉ **ADMIN** hoặc **creator** của problem. Luồng: gọi endpoint này → PUT file tới `uploadUrl` → `POST .../confirm-upload` với `objectKey`.',
  })
  @Post('problems/:problemId/golden-solutions/presign-upload')
  async presignUpload(
    @Param('problemId') problemId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: PresignUploadGoldenDto,
  ) {
    return this.goldenSolutions.createPresignUpload(problemId, user, dto);
  }

  @ApiOperation({ summary: 'Xác nhận đã upload — lưu sourceCodeObjectKey' })
  @Post('golden-solutions/:id/confirm-upload')
  async confirmUpload(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ConfirmGoldenUploadDto,
  ) {
    return this.goldenSolutions.confirmUpload(id, user, dto);
  }

  @ApiOperation({ summary: 'Liệt kê golden solutions của một problem' })
  @Get('problems/:problemId/golden-solutions')
  async list(@Param('problemId') problemId: string, @CurrentUser() user: RequestUser) {
    return this.goldenSolutions.listForProblem(problemId, user);
  }
}
