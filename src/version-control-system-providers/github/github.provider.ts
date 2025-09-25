import { Injectable } from '@nestjs/common';
import { HttpClient } from 'src/core/http/http.client';
import { CacheService } from 'src/core/cache/cache.service';
import { ConfigService } from 'src/core/config/config.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { CacheSetOptions } from 'src/core/cache/cache.types';
import { GithubSearchReposResponse } from './github.types';
import { MetricsService } from 'src/core/observability/metrics.service';
import { CacheKeyPrefix } from 'src/core/shared/cache-keys';
import { Metrics } from 'src/core/observability/metrics.enum';
import {
  BadRequestError,
  VCSApiError,
  VCSRateLimitError,
} from 'src/core/shared/shared.errors';
import { BaseVersionControlSystemProvider } from 'src/version-control-system-providers/base-version-control-system.provider';
import { VcsSearchParams } from 'src/version-control-system-providers/shared/search.types';
import {
  VcsRepository,
  VcsSearchReposResponse,
} from 'src/version-control-system-providers/shared/repository.types';
import { mapGithubRepoToVcsRepository } from './github.mapper';
import { VcsProviderKind } from 'src/version-control-system-providers/shared/provider.types';
import { buildProviderAwareKey } from 'src/core/shared/cache-key.util';

type CanonicalPayload = {
  q: string;
  per_page: number;
  page: number;
  sort?: string;
  order?: string;
};

@Injectable()
export class GithubProvider extends BaseVersionControlSystemProvider {
  readonly kind = VcsProviderKind.Github;
  private readonly apiBaseUrl: string;
  private readonly apiVersion: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly BODY_TTL_MS: number;

  constructor(
    appLogger: AppLogger,
    metrics: MetricsService,
    private readonly http: HttpClient,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {
    super(appLogger, metrics);

    this.apiBaseUrl = this.config.get('github.baseUrl');
    this.apiVersion = this.config.get('github.apiVersion');
    this.token = this.config.get('github.token');
    this.timeoutMs = this.config.get('github.timeoutMs');
    this.BODY_TTL_MS = this.config.get('cache.searchTtlMs');

    if (!this.apiBaseUrl) throw new Error('github.baseUrl not configured');
    if (!this.apiVersion) throw new Error('github.apiVersion not configured');
  }

  async searchRepositories(
    params: VcsSearchParams,
  ): Promise<VcsSearchReposResponse> {
    const query = this.buildQuery(params);
    this.validateQueryConstraints(query);

    const payload = this.buildCanonicalPayload(params, query);
    const bodyKey = buildProviderAwareKey(
      CacheKeyPrefix.GithubSearchBody,
      payload,
    );

    const cached = await this.cache.get<VcsSearchReposResponse>(bodyKey);
    if (cached) {
      this.metrics.increment(Metrics.GithubSearchCacheHitTotal);
      this.logger.debug?.(`GitHub search cache HIT key=${bodyKey}`);
      return cached;
    }

    this.metrics.increment(Metrics.GithubSearchCacheMissTotal);
    this.logger.debug?.(
      `GitHub search cache MISS key=${bodyKey} q="${payload.q}" per=${payload.per_page} page=${payload.page}`,
    );

    const headers = this.buildHeaders();

    const resp = await this.requestGithub(payload, headers);
    this.handleUpstreamErrors(resp);

    const setOptions: CacheSetOptions = { ttlMs: this.BODY_TTL_MS };
    const mapped: VcsRepository[] = resp.data.items.map(
      mapGithubRepoToVcsRepository,
    );
    const canonical: VcsSearchReposResponse = {
      total_count: resp.data.total_count,
      incomplete_results: resp.data.incomplete_results,
      items: mapped,
    };
    await this.cache.set(bodyKey, canonical, setOptions);
    this.metrics.increment(Metrics.GithubSearch200Total);
    return canonical;
  }

  private handleUpstreamErrors(resp: {
    status: number;
    headers?: Record<string, unknown> | undefined;
    data: unknown;
  }) {
    const h: Record<string, unknown> = resp.headers ?? {};
    const retryAfter = Number(
      typeof h['retry-after'] === 'string' ||
        typeof h['retry-after'] === 'number'
        ? h['retry-after']
        : 0,
    );
    const remaining = Number(
      typeof h['x-ratelimit-remaining'] === 'string' ||
        typeof h['x-ratelimit-remaining'] === 'number'
        ? h['x-ratelimit-remaining']
        : '0',
    );

    if (resp.status === 403 && (retryAfter > 0 || remaining === 0)) {
      throw new VCSRateLimitError(retryAfter || 60, { responseHeaders: h });
    }

    if (resp.status >= 400) {
      throw new VCSApiError(resp.status, { response: resp.data });
    }
  }

  private async requestGithub(
    payload: CanonicalPayload,
    headers: Record<string, string>,
  ) {
    const url = `${this.apiBaseUrl}/search/repositories`;
    return this.http.request<GithubSearchReposResponse>('GET', url, undefined, {
      headers,
      params: payload,
      timeoutMs: this.timeoutMs,
      retry: { retries: 2, delayMs: 500 },
      validateStatus: (s) => s >= 200 && s < 500,
    });
  }

  private buildHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': this.apiVersion,
      'User-Agent': 'version-control-system-repository-scorer/1.0',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private buildCanonicalPayload(
    params: VcsSearchParams,
    q: string,
  ): CanonicalPayload {
    const perPageDefault = 20;
    const per_page = Math.min(
      Math.max(params.perPage ?? perPageDefault, 1),
      100,
    );
    const maxPage = Math.max(1, Math.floor(1000 / per_page));
    const requestedPage = Math.max(params.page ?? 1, 1);
    const page = Math.min(requestedPage, maxPage);
    return {
      q,
      per_page,
      page,
      sort: 'stars',
      order: 'desc',
    };
  }

  private buildQuery(params: VcsSearchParams): string {
    const components: string[] = [];
    if (params.createdFrom) components.push(`created:>=${params.createdFrom}`);
    if (params.language) components.push(`language:${params.language}`);
    const q = components.join(' ').trim();
    return q.length > 0 ? q : 'stars:>0';
  }

  private validateQueryConstraints(q: string): void {
    if (q.length > 256) {
      throw new BadRequestError(
        'Query string exceeds the 256-character limit.',
        {
          code: 'QUERY_MAX_LENGTH_EXCEEDED',
          details: { maxLength: 256, query: q },
        },
      );
    }
    const matches = q.match(/\b(AND|OR|NOT)\b/gi);
    const operatorCount = matches?.length ?? 0;
    if (operatorCount > 5) {
      throw new BadRequestError(
        'Query contains more than 5 boolean operators (AND/OR/NOT).',
        {
          code: 'QUERY_TOO_MANY_BOOLEAN_OPERATORS',
          details: { operatorCount, maxAllowed: 5 },
        },
      );
    }
  }
}
