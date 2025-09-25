import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/core/base/base.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { VcsProviderRegistry } from 'src/version-control-system-providers/version-control-system-providers.module';
import { CacheService } from 'src/core/cache/cache.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { ScoringService } from 'src/scoring/scoring.service';
import { ScoredSearchResponse } from 'src/scoring/scoring.types';
import { ConfigService } from 'src/core/config/config.service';
import { CacheKeyPrefix } from 'src/core/shared/cache-keys';
import { Metrics } from 'src/core/observability/metrics.enum';
import { VcsSearchParams } from 'src/version-control-system-providers/shared/search.types';
import { buildProviderAwareKey } from 'src/core/shared/cache-key.util';
import { GitlabProvider } from 'src/version-control-system-providers/gitlab/gitlab.provider';

@Injectable()
export class SearchService extends BaseService {
  constructor(
    appLogger: AppLogger,
    metrics: MetricsService,
    private readonly vcsRegistry: VcsProviderRegistry,
    private readonly scoring: ScoringService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {
    super(appLogger, metrics);
  }

  async searchRepositoriesScored(
    params: VcsSearchParams,
  ): Promise<ScoredSearchResponse> {
    const canonical = this.buildCanonicalParams(params);
    const provider = this.vcsRegistry.getDefault();
    const prefix =
      provider instanceof GitlabProvider
        ? CacheKeyPrefix.GitlabScored
        : CacheKeyPrefix.GithubScored;
    const key = buildProviderAwareKey(prefix, canonical);

    const cached = await this.cache.get<ScoredSearchResponse>(key);
    if (cached) {
      this.metrics.increment(Metrics.SearchScoredCacheHitTotal);
      this.logger.debug?.(`Search scored cache HIT key=${key}`);
      return cached;
    }

    this.metrics.increment(Metrics.SearchScoredCacheMissTotal);
    this.logger.debug?.(
      `Search scored cache MISS key=${key} qParts=${JSON.stringify({ createdFrom: canonical.createdFrom, language: canonical.language })} per=${canonical.perPage} page=${canonical.page}`,
    );

    const raw = await provider.searchRepositories(canonical);
    const scored = this.scoring.scoreRepositories(raw.items);

    const response = {
      totalCount: raw.total_count,
      incompleteResults: raw.incomplete_results,
      items: scored.sort((a, b) => b.score - a.score),
    };

    const ttlMs = this.config.get<number>('cache.scoredTtlMs');
    await this.cache.set(key, response, { ttlMs });
    this.metrics.increment(Metrics.SearchScored200Total);
    return response;
  }

  private buildCanonicalParams(params: VcsSearchParams): VcsSearchParams {
    const perPage = Math.min(Math.max(params.perPage ?? 50, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    return {
      createdFrom: params.createdFrom,
      language: params.language,
      perPage,
      page,
    };
  }
}
