import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GoldenSolutionsController } from './golden-solutions.controller';
import { GoldenSolutionsService } from './golden-solutions.service';

@Module({
  imports: [PrismaModule],
  controllers: [GoldenSolutionsController],
  providers: [GoldenSolutionsService],
})
export class GoldenSolutionsModule {}
