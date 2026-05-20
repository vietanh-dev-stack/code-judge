import { Module } from '@nestjs/common';
import { BullMqModule } from '../queues/bullmq.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProblemsModule } from '../problems/problems.module';
import { StorageModule } from '../storage/storage.module';
import { AiHintController } from './ai-hint.controller';
import { AiHintRateLimitService } from './ai-hint-rate-limit.service';
import { AiHintService } from './ai-hint.service';

@Module({
  imports: [PrismaModule, StorageModule, BullMqModule, ProblemsModule],
  controllers: [AiHintController],
  providers: [AiHintService, AiHintRateLimitService],
  exports: [AiHintService],
})
export class AiHintModule {}
