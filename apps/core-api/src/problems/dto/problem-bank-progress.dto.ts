import { ApiProperty } from '@nestjs/swagger';

export class ProblemBankProgressDto {
  @ApiProperty({ description: 'Tổng số bài public trong problem bank' })
  total!: number;

  @ApiProperty({ description: 'Số bài user đã Accepted trong bank' })
  solved!: number;

  @ApiProperty({
    description: 'Số bài đã solved theo độ khó (toàn bank)',
    example: { EASY: 2, MEDIUM: 1, HARD: 0 },
  })
  byDifficulty!: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}
