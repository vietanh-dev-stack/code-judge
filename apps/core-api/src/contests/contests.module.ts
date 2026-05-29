import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProblemsModule } from '../problems/problems.module';
import { ContestAccessService } from './contest-access.service';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { ContestsCronService } from './contests.cron';

@Module({
  imports: [PrismaModule, ProblemsModule],
  controllers: [ContestsController],
  providers: [ContestsService, ContestsCronService, ContestAccessService],
  exports: [ContestAccessService, ContestsService],
})
export class ContestsModule {}
