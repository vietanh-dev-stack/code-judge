import { Module } from '@nestjs/common';
import { BullMqModule } from '../queues/bullmq.module';
import { AiGoldenVerifyService } from './ai-golden-verify.service';
import { AiTestcaseController } from './ai-testcase.controller';
import { AiTestcaseService } from './ai-testcase.service';

@Module({
  imports: [BullMqModule],
  controllers: [AiTestcaseController],
  providers: [AiTestcaseService, AiGoldenVerifyService],
  exports: [AiTestcaseService, AiGoldenVerifyService],
})
export class AiTestcaseModule {}
