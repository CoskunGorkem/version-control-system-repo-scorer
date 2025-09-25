import { SearchService } from './search.service';
import { VcsProviderRegistry } from 'src/version-control-system-providers/version-control-system-providers.module';
import { ScoringService } from 'src/scoring/scoring.service';
import { CacheService } from 'src/core/cache/cache.service';
import { ConfigService } from 'src/core/config/config.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { Metrics } from 'src/core/observability/metrics.enum';
import { VcsSearchParams } from 'src/version-control-system-providers/shared/search.types';
import {
  VcsRepository,
  VcsSearchReposResponse,
} from 'src/version-control-system-providers/shared/repository.types';
import { TestingModule } from '@nestjs/testing';
import { getTestModule, testProvider } from 'src/core/shared/test-providers';
import { Path } from 'convict';
import { Config } from 'src/core/config/config.type';

describe('SearchService', () => {
  let registry: jest.Mocked<Pick<VcsProviderRegistry, 'getDefault'>>;
  let scoring: jest.Mocked<Pick<ScoringService, 'scoreRepositories'>>;
  let cache: jest.Mocked<Pick<CacheService, 'get' | 'set'>>;
  let configGet: ConfigService['get'];
  let appLogger: Pick<AppLogger, 'withContext'>;
  let withCtx: jest.Mock;
  let metrics: jest.Mocked<Pick<MetricsService, 'increment'>>;
  let service: SearchService;

  beforeEach(async () => {
    registry = { getDefault: jest.fn() } as any;
    scoring = { scoreRepositories: jest.fn() };
    cache = { get: jest.fn(), set: jest.fn() };
    const values = { 'cache.scoredTtlMs': 5000 };
    configGet = <T>(key: Path<Config>) =>
      values[key as keyof typeof values] as unknown as T;
    withCtx = jest.fn().mockReturnValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    });

    appLogger = { withContext: withCtx };
    metrics = { increment: jest.fn() };

    const module: TestingModule = await getTestModule([
      SearchService,
      testProvider(AppLogger, appLogger),
      testProvider(MetricsService, metrics),
      testProvider(VcsProviderRegistry, registry),
      testProvider(ScoringService, scoring),
      testProvider(CacheService, cache),
      testProvider<Pick<ConfigService, 'get'>>(ConfigService, {
        get: configGet,
      }),
    ]);

    service = module.get(SearchService);
  });

  it('returns cached response on hit and increments hit metric', async () => {
    const params: VcsSearchParams = {
      language: 'ts',
      createdFrom: '2024-01-01',
      perPage: 30,
      page: 2,
    };
    cache.get.mockResolvedValueOnce({
      totalCount: 0,
      incompleteResults: false,
      items: [],
    });
    const res = await service.searchRepositoriesScored(params);
    expect(metrics.increment).toHaveBeenCalledWith(
      Metrics.SearchScoredCacheHitTotal,
    );
    expect(res.items).toEqual([]);
  });

  it('miss: fetches, scores, caches, and returns response', async () => {
    cache.get.mockResolvedValueOnce(undefined);
    const params: VcsSearchParams = {
      language: 'TypeScript',
      createdFrom: '2024-01-01',
      perPage: 200,
      page: 0,
    };
    const upstream: VcsSearchReposResponse = {
      total_count: 2,
      incomplete_results: false,
      items: [
        {
          id: 1,
          name: 'r',
          full_name: 'o/r',
          html_url: '',
          stargazers_count: 0,
          forks_count: 0,
          updated_at: new Date().toISOString(),
          language: 'ts',
          description: null,
          owner: { login: 'o', id: 1, avatar_url: '', html_url: '' },
        } as VcsRepository,
      ],
    };
    registry.getDefault.mockReturnValue({
      searchRepositories: jest.fn().mockResolvedValue(upstream),
    } as any);
    const scored = [
      {
        repository: upstream.items[0],
        score: 0.5,
        breakdown: {
          normalizedStars: 0.1,
          normalizedForks: 0.1,
          recencyScore: 0.8,
          weights: { stars: 0.5, forks: 0.3, recency: 0.2 },
        },
      },
    ];
    scoring.scoreRepositories.mockReturnValueOnce(
      scored as ReturnType<ScoringService['scoreRepositories']>,
    );

    const res = await service.searchRepositoriesScored(params);
    expect(metrics.increment).toHaveBeenCalledWith(
      Metrics.SearchScoredCacheMissTotal,
    );
    expect(res.totalCount).toBe(2);
    expect(res.items).toEqual(scored);

    expect(cache.set).toHaveBeenCalled();
    expect(metrics.increment).toHaveBeenCalledWith(
      Metrics.SearchScored200Total,
    );
  });
});
