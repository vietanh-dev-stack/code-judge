import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { BullMqModule } from './queues/bullmq.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { ProblemsModule } from './problems/problems.module';
import { ContestsModule } from './contests/contests.module';
import { ClassroomModule } from './classrooms/classroom.module';
import { AiTestcaseModule } from './ai-testcase/ai-testcase.module';
import { InvitesModule } from './invites/invites.module';
import { MailModule } from './mail/mail.module';
import { GoldenSolutionsModule } from './golden-solutions/golden-solutions.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { TagsModule } from './tags/tags.module';
import { AiHintModule } from './ai-hint/ai-hint.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    AuthModule,
    UsersModule,
    ClassroomModule,
    AiTestcaseModule,
    StorageModule,
    PrismaModule,
    RealtimeModule,
    BullMqModule,
    ProblemsModule,
    ContestsModule,
    SubmissionsModule,
    MailModule,
    InvitesModule,
    GoldenSolutionsModule,
    AdminDashboardModule,
    TagsModule,
    AiHintModule,
  ],
})
export class AppModule {}
