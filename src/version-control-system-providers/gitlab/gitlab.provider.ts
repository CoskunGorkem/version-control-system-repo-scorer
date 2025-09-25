import { Injectable } from '@nestjs/common';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { BaseVersionControlSystemProvider } from 'src/version-control-system-providers/base-version-control-system.provider';
import { VcsSearchParams } from 'src/version-control-system-providers/shared/search.types';
import { VcsSearchReposResponse } from 'src/version-control-system-providers/shared/repository.types';
import { VcsProviderKind } from 'src/version-control-system-providers/shared/provider.types';

// Placeholder provider for demonstration purposes only.
// This shows how an additional VCS provider (e.g., GitLab) would be added.
@Injectable()
export class GitlabProvider extends BaseVersionControlSystemProvider {
  readonly kind = VcsProviderKind.Gitlab;
  constructor(appLogger: AppLogger, metrics: MetricsService) {
    super(appLogger, metrics);
  }

  async searchRepositories(
    _params: VcsSearchParams,
  ): Promise<VcsSearchReposResponse> {
    this.logger.warn?.('GitlabProvider is a placeholder and not implemented.');
    return await Promise.resolve({
      total_count: 0,
      incomplete_results: false,
      items: [],
    });
  }
}
