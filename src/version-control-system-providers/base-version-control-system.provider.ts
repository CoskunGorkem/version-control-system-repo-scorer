import { BaseService } from 'src/core/base/base.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { VcsSearchParams } from './shared/search.types';
import { VcsSearchReposResponse } from './shared/repository.types';

export abstract class BaseVersionControlSystemProvider extends BaseService {
  constructor(appLogger: AppLogger, metrics: MetricsService) {
    super(appLogger, metrics);
  }

  abstract searchRepositories(
    payload: VcsSearchParams,
  ): Promise<VcsSearchReposResponse>;
}
