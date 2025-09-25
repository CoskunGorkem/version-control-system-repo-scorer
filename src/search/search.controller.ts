import { Controller, Get, Query } from '@nestjs/common';
import { BaseController } from 'src/core/base/base.controller';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchQueryResponseDto } from './search.dto';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiBadGatewayResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from 'src/core/shared/error-response.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController extends BaseController {
  constructor(
    private readonly search: SearchService,
    appLogger: AppLogger,
    metrics: MetricsService,
  ) {
    super(appLogger, metrics);
  }

  @Get('repositories/scored')
  @ApiOperation({
    summary:
      'Search Version Control System repositories and return scored results',
  })
  @ApiQuery({
    name: 'language',
    required: true,
    description: 'Filter by language',
  })
  @ApiQuery({
    name: 'createdFrom',
    required: true,
    description: 'ISO date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
  })
  @ApiOkResponse({ type: SearchQueryResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation or query constraint error',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'VCS rate limit exceeded',
    type: ErrorResponseDto,
  })
  @ApiBadGatewayResponse({
    description: 'VCS API error',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'External service unavailable',
    type: ErrorResponseDto,
  })
  async getRepositoriesScored(@Query() query: SearchQueryDto) {
    const result = await this.search.searchRepositoriesScored(query);
    return new SearchQueryResponseDto(result);
  }
}
