import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ScoredSearchResponse } from 'src/scoring/scoring.types';
import { ApiProperty } from '@nestjs/swagger';
import { ScoredRepositoryDto } from 'src/scoring/scoring.dto';

export class SearchQueryDto {
  @IsDefined()
  @IsString()
  @ApiProperty({ description: 'Filter by language', required: true })
  language: string;

  @IsDefined()
  @IsISO8601()
  @ApiProperty({ description: 'ISO date (YYYY-MM-DD)', required: true })
  createdFrom: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;
}

export class SearchQueryResponseDto {
  constructor(scoredSearchResponse: ScoredSearchResponse) {
    this.totalCount = scoredSearchResponse.totalCount;
    this.incompleteResults = scoredSearchResponse.incompleteResults;
    this.items = scoredSearchResponse.items.map((s) =>
      ScoredRepositoryDto.from(s),
    );
  }

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  incompleteResults: boolean;

  @ApiProperty({ type: () => ScoredRepositoryDto, isArray: true })
  @Type(() => ScoredRepositoryDto)
  items: ScoredRepositoryDto[];
}
