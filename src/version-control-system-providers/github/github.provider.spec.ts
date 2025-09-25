import { GithubProvider } from './github.provider';
import { HttpClient } from 'src/core/http/http.client';
import { CacheService } from 'src/core/cache/cache.service';
import { ConfigService } from 'src/core/config/config.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { GithubSearchReposResponse } from './github.types';
import { buildCacheKey } from 'src/core/shared/cache-key.util';
import { CacheKeyPrefix } from 'src/core/shared/cache-keys';
import { Metrics } from 'src/core/observability/metrics.enum';
import { VCSApiError, VCSRateLimitError } from 'src/core/shared/shared.errors';
import { HttpRequestOptions, HttpResponse } from 'src/core/http/http.types';
import { TestingModule } from '@nestjs/testing';
import { getTestModule, testProvider } from 'src/core/shared/test-providers';
import { Path } from 'convict';
import { Config } from 'src/core/config/config.type';
import { VcsSearchParams } from 'src/version-control-system-providers/shared/search.types';
import { VcsSearchReposResponse } from 'src/version-control-system-providers/shared/repository.types';
import { mapGithubRepoToVcsRepository } from './github.mapper';

describe('GithubProvider', () => {
  let http: { request: jest.MockedFunction<HttpClient['request']> };
  let cache: {
    get: jest.MockedFunction<CacheService['get']>;
    set: jest.MockedFunction<CacheService['set']>;
  };
  let appLogger: Pick<AppLogger, 'withContext'>;
  let withCtx: jest.Mock;
  let metrics: MetricsService;
  let service: GithubProvider;
  const baseUrl = 'https://api.github.com';
  const apiVersion = '2022-11-28';
  const token = 'tkn';
  const timeoutMs = 1234;
  const ttlMs = 9999;

  beforeEach(async () => {
    http = { request: jest.fn() };
    cache = { get: jest.fn(), set: jest.fn() };

    const values = {
      'github.baseUrl': baseUrl,
      'github.apiVersion': apiVersion,
      'github.token': token,
      'github.timeoutMs': timeoutMs,
      'cache.searchTtlMs': ttlMs,
    };
    const configGet: ConfigService['get'] = <T>(key: Path<Config>) =>
      values[key as keyof typeof values] as unknown as T;

    withCtx = jest.fn().mockReturnValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    });

    appLogger = { withContext: withCtx };
    metrics = new MetricsService();
    jest.spyOn(metrics, 'increment').mockImplementation(() => {});

    const module: TestingModule = await getTestModule([
      GithubProvider,
      testProvider(AppLogger, appLogger),
      testProvider(MetricsService, metrics),
      testProvider(HttpClient, http),
      testProvider(CacheService, cache),
      testProvider<Pick<ConfigService, 'get'>>(ConfigService, {
        get: configGet,
      }),
    ]);
    service = module.get(GithubProvider);
  });

  it('throws when required config is missing', async () => {
    const makeModule = (overrides: Partial<Record<string, unknown>>) => {
      const values = {
        'github.baseUrl': overrides.baseUrl ?? baseUrl,
        'github.apiVersion': overrides.apiVersion ?? apiVersion,
        'github.token': token,
        'github.timeoutMs': timeoutMs,
        'cache.searchTtlMs': ttlMs,
      } as const;
      const configGet: ConfigService['get'] = <T>(key: Path<Config>) =>
        values[key] as T;
      return getTestModule([
        GithubProvider,
        testProvider(AppLogger, appLogger),
        testProvider(MetricsService, metrics),
        testProvider(HttpClient, http),
        testProvider(CacheService, cache),
        testProvider<Pick<ConfigService, 'get'>>(ConfigService, {
          get: configGet,
        }),
      ]);
    };

    await expect(makeModule({ baseUrl: '' })).rejects.toThrow(
      'github.baseUrl not configured',
    );
    await expect(makeModule({ apiVersion: '' })).rejects.toThrow(
      'github.apiVersion not configured',
    );
  });

  it('returns cached response and increments hit metric', async () => {
    const params: VcsSearchParams = {
      language: 'ts',
      createdFrom: '2024-01-01',
      perPage: 10,
      page: 2,
      sort: 'stars',
      order: 'desc',
    };
    const payload = {
      q: 'created:>=2024-01-01 language:ts',
      per_page: 10,
      page: 2,
      sort: 'stars',
      order: 'desc',
    };
    const key = buildCacheKey(CacheKeyPrefix.GithubSearchBody, payload);
    const cached: VcsSearchReposResponse = {
      total_count: 1,
      incomplete_results: false,
      items: [],
    };
    cache.get.mockResolvedValueOnce(cached);

    const res = await service.searchRepositories(params);
    expect(cache.get).toHaveBeenCalledWith(key);
    expect(res).toBe(cached);
    expect(metrics.increment).toHaveBeenCalledWith(
      Metrics.GithubSearchCacheHitTotal,
    );
    expect(http.request).not.toHaveBeenCalled();
  });

  it('fetches from upstream on miss, caches, maps to canonical, and returns data', async () => {
    const params: VcsSearchParams = {
      language: 'TypeScript',
      createdFrom: '2024-01-01',
      perPage: 200,
      page: 0,
      sort: 'stars',
      order: 'desc',
    };
    cache.get.mockResolvedValueOnce(undefined);
    const upstream: GithubSearchReposResponse = {
      total_count: 3,
      incomplete_results: false,
      items: [],
    };
    const resp: HttpResponse<GithubSearchReposResponse> = {
      status: 200,
      data: upstream,
      headers: {},
    };
    http.request.mockResolvedValueOnce(resp);

    const res = await service.searchRepositories(params);
    expect(metrics.increment).toHaveBeenCalledWith(
      Metrics.GithubSearchCacheMissTotal,
    );
    expect(res).toEqual({
      total_count: upstream.total_count,
      incomplete_results: upstream.incomplete_results,
      items: upstream.items.map(mapGithubRepoToVcsRepository),
    });

    const call = http.request.mock.calls[0][3] as HttpRequestOptions;
    expect(http.request.mock.calls[0][0]).toBe('GET');
    expect(http.request.mock.calls[0][1]).toBe(
      `${baseUrl}/search/repositories`,
    );
    expect(call.timeoutMs).toBe(timeoutMs);
    expect(call.params).toEqual({
      q: 'created:>=2024-01-01 language:TypeScript',
      per_page: 100,
      page: 1,
      sort: 'stars',
      order: 'desc',
    });
    expect(call.headers).toMatchObject({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': apiVersion,
      'User-Agent': 'version-control-system-repository-scorer/1.0',
      Authorization: `Bearer ${token}`,
    });

    const payload = {
      q: 'created:>=2024-01-01 language:TypeScript',
      per_page: 100,
      page: 1,
      sort: 'stars',
      order: 'desc',
    };
    const key = buildCacheKey(CacheKeyPrefix.GithubSearchBody, payload);
    expect(cache.set).toHaveBeenCalledWith(
      key,
      {
        total_count: upstream.total_count,
        incomplete_results: upstream.incomplete_results,
        items: upstream.items.map(mapGithubRepoToVcsRepository),
      },
      { ttlMs },
    );
    expect(metrics.increment).toHaveBeenCalledWith(
      Metrics.GithubSearch200Total,
    );
  });

  it('throws GitHubRateLimitError on rate limit (retry-after)', async () => {
    cache.get.mockResolvedValueOnce(undefined);
    const resp: HttpResponse<GithubSearchReposResponse> = {
      status: 403,
      data: {} as GithubSearchReposResponse,
      headers: { 'retry-after': '60' },
    };
    http.request.mockResolvedValueOnce(resp);
    await expect(
      service.searchRepositories({} as VcsSearchParams),
    ).rejects.toBeInstanceOf(VCSRateLimitError);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('throws GitHubApiError on 4xx/5xx (non-rate limit)', async () => {
    cache.get.mockResolvedValueOnce(undefined);
    const resp: HttpResponse<GithubSearchReposResponse> = {
      status: 404,
      data: {} as GithubSearchReposResponse,
      headers: {},
    };
    http.request.mockResolvedValueOnce(resp);
    await expect(
      service.searchRepositories({} as VcsSearchParams),
    ).rejects.toBeInstanceOf(VCSApiError);
  });
});
