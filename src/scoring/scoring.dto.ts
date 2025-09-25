import { ApiProperty } from '@nestjs/swagger';
import {
  ScoredRepository,
  ScoringBreakdown,
  ScoringWeights,
} from 'src/scoring/scoring.types';
import { Type } from 'class-transformer';
import { VcsRepositoryDto } from 'src/version-control-system-providers/shared/repository.dto';
import { round } from 'src/core/shared/number.utils';

export class ScoringWeightsDto {
  @ApiProperty()
  stars: number;

  @ApiProperty()
  forks: number;

  @ApiProperty()
  recency: number;

  static from(w: ScoringWeights): ScoringWeightsDto {
    const dto = new ScoringWeightsDto();
    dto.stars = round(w.stars);
    dto.forks = round(w.forks);
    dto.recency = round(w.recency);
    return dto;
  }
}

export class ScoringBreakdownDto {
  @ApiProperty()
  normalizedStars: number;

  @ApiProperty()
  normalizedForks: number;

  @ApiProperty()
  recencyScore: number;

  @ApiProperty({ type: () => ScoringWeightsDto })
  @Type(() => ScoringWeightsDto)
  weights: ScoringWeightsDto;

  static from(b: ScoringBreakdown): ScoringBreakdownDto {
    const dto = new ScoringBreakdownDto();
    dto.normalizedStars = round(b.normalizedStars);
    dto.normalizedForks = round(b.normalizedForks);
    dto.recencyScore = round(b.recencyScore);
    dto.weights = ScoringWeightsDto.from(b.weights);
    return dto;
  }
}

export class ScoredRepositoryDto {
  @ApiProperty({ type: () => VcsRepositoryDto })
  @Type(() => VcsRepositoryDto)
  repository: VcsRepositoryDto;

  @ApiProperty()
  score: number;

  @ApiProperty({ type: () => ScoringBreakdownDto })
  @Type(() => ScoringBreakdownDto)
  breakdown: ScoringBreakdownDto;

  static from(s: ScoredRepository): ScoredRepositoryDto {
    const dto = new ScoredRepositoryDto();
    dto.repository = VcsRepositoryDto.from(s.repository);
    dto.score = round(s.score);
    dto.breakdown = ScoringBreakdownDto.from(s.breakdown);
    return dto;
  }
}
