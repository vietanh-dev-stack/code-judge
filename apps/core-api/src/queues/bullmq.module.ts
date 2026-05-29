import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { Queue, QueueEvents } from 'bullmq';
import {
  CALIBRATE_LIMITS_QUEUE_NAME,
  GOLDEN_VERIFY_QUEUE_NAME,
  JUDGE_SUBMISSIONS_QUEUE_NAME,
  REPORT_EXPORT_QUEUE_NAME,
} from '../common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BullMqEventsService } from './bullmq-events.service';
import {
  CALIBRATE_LIMITS_QUEUE,
  CALIBRATE_LIMITS_QUEUE_EVENTS,
  GOLDEN_VERIFY_QUEUE,
  GOLDEN_VERIFY_QUEUE_EVENTS,
  JUDGE_QUEUE,
  JUDGE_QUEUE_EVENTS,
  REDIS_CONNECTION,
  REPORT_EXPORT_QUEUE,
} from './tokens';

@Module({
  imports: [RealtimeModule],
  providers: [
    {
      provide: REDIS_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        return new IORedis(redisUrl, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: JUDGE_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (redis: IORedis) => {
        return new Queue(JUDGE_SUBMISSIONS_QUEUE_NAME, { connection: redis });
      },
    },
    {
      provide: JUDGE_QUEUE_EVENTS,
      inject: [REDIS_CONNECTION],
      useFactory: (redis: IORedis) => {
        return new QueueEvents(JUDGE_SUBMISSIONS_QUEUE_NAME, { connection: redis });
      },
    },
    {
      provide: GOLDEN_VERIFY_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (redis: IORedis) => {
        return new Queue(GOLDEN_VERIFY_QUEUE_NAME, { connection: redis });
      },
    },
    {
      provide: GOLDEN_VERIFY_QUEUE_EVENTS,
      inject: [REDIS_CONNECTION],
      useFactory: (redis: IORedis) => {
        return new QueueEvents(GOLDEN_VERIFY_QUEUE_NAME, { connection: redis });
      },
    },
    {
      provide: REPORT_EXPORT_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (redis: IORedis) => {
        return new Queue(REPORT_EXPORT_QUEUE_NAME, { connection: redis });
      },
    },
    {
      provide: CALIBRATE_LIMITS_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (redis: IORedis) => {
        return new Queue(CALIBRATE_LIMITS_QUEUE_NAME, { connection: redis });
      },
    },
    {
      provide: CALIBRATE_LIMITS_QUEUE_EVENTS,
      inject: [REDIS_CONNECTION],
      useFactory: (redis: IORedis) => {
        return new QueueEvents(CALIBRATE_LIMITS_QUEUE_NAME, { connection: redis });
      },
    },
    BullMqEventsService,
  ],
  exports: [
    REDIS_CONNECTION,
    JUDGE_QUEUE,
    GOLDEN_VERIFY_QUEUE,
    GOLDEN_VERIFY_QUEUE_EVENTS,
    CALIBRATE_LIMITS_QUEUE,
    CALIBRATE_LIMITS_QUEUE_EVENTS,
    REPORT_EXPORT_QUEUE,
  ],
})
export class BullMqModule {}

