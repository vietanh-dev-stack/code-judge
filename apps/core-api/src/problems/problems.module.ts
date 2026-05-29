import { Module } from '@nestjs/common';
import { AiTestcaseModule } from '../ai-testcase/ai-testcase.module';
import { BullMqModule } from '../queues/bullmq.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminProblemsService } from './admin-problems.service';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';
import { ProblemAccessService } from './problem-access.service';
import { ProblemLimitsService } from './problem-limits.service';
import { ProblemVisibilityService } from './problem-visibility.service';

@Module({
  imports: [PrismaModule, AiTestcaseModule, BullMqModule],
  controllers: [ProblemsController],
  providers: [
    ProblemsService,
    AdminProblemsService,
    ProblemVisibilityService,
    ProblemAccessService,
    ProblemLimitsService,
  ],
  exports: [ProblemsService, ProblemAccessService],
})
export class ProblemsModule {}
