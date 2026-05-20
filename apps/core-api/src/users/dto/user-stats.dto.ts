import { ApiProperty } from '@nestjs/swagger';

/** Per difficulty: attempted = distinct problems with ≥1 submission; solved = Accepted (all tests passed). */
export class DifficultyBreakdownDto {
  @ApiProperty({ description: 'Distinct problems solved (Accepted)' })
  solved!: number;

  @ApiProperty({ description: 'Distinct problems with at least one graded submission' })
  attempted!: number;
}

export class LanguageUsageDto {
  @ApiProperty()
  language!: string;

  @ApiProperty()
  count!: number;
}

export class RecentActivityItemDto {
  @ApiProperty({ enum: ['submission', 'contest', 'class'] })
  type!: 'submission' | 'contest' | 'class';

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;
}

export class UserStatsDto {
  @ApiProperty({ description: 'Distinct problems with at least one Accepted submission' })
  problemsSolved!: number;

  @ApiProperty({ description: 'Distinct problems with at least one graded submission' })
  problemsAttempted!: number;

  /** Round(problemsSolved / problemsAttempted * 100), 0 if no attempts */
  @ApiProperty()
  successRate!: number;

  @ApiProperty({ type: () => DifficultyBreakdownDto })
  byDifficulty!: {
    easy: DifficultyBreakdownDto;
    medium: DifficultyBreakdownDto;
    hard: DifficultyBreakdownDto;
  };

  @ApiProperty({ type: [LanguageUsageDto] })
  languages!: LanguageUsageDto[];

  @ApiProperty({ nullable: true })
  avgRuntimeMs!: number | null;

  @ApiProperty({ type: [RecentActivityItemDto] })
  recentActivity!: RecentActivityItemDto[];
}
