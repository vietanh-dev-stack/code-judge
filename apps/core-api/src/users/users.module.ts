import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserStatsService } from './user-stats.service';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserStatsService],
  exports: [UsersService, UserStatsService],
})
export class UsersModule {}
