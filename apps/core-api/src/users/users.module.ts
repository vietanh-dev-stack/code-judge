import { Module } from '@nestjs/common';
import { ProblemsModule } from '../problems/problems.module';
import { UsersController } from './users.controller';
import { UserStatsService } from './user-stats.service';
import { UsersService } from './users.service';

@Module({
  imports: [ProblemsModule],
  controllers: [UsersController],
  providers: [UsersService, UserStatsService],
  exports: [UsersService, UserStatsService],
})
export class UsersModule {}
