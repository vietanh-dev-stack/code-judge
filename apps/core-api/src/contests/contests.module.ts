import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { ContestsCronService } from './contests.cron';

@Module({
  imports: [PrismaModule],
  controllers: [ContestsController],
  providers: [ContestsService, ContestsCronService],
})
export class ContestsModule {}
