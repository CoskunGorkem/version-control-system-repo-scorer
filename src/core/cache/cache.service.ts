import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/core/cache/redis.service';
import { CacheSetOptions } from 'src/core/cache/cache.types';
import { BaseService } from 'src/core/base/base.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { Metrics } from 'src/core/observability/metrics.enum';

@Injectable()
export class CacheService extends BaseService {
  constructor(
    appLogger: AppLogger,
    metrics: MetricsService,
    private readonly redis: RedisService,
  ) {
    super(appLogger, metrics);
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheSetOptions = {},
  ): Promise<void> {
    const ttlSeconds = options.ttlMs
      ? Math.ceil(options.ttlMs / 1000)
      : undefined;
    const t0 = Date.now();

    try {
      await this.redis.setJson<T>(key, value, ttlSeconds);
      this.logger.debug?.(`CACHE SET key=${key} ttl=${ttlSeconds ?? '∞'}`);
      this.metrics.increment(Metrics.CacheSetTotal, { type: 'json' });
    } catch (error: unknown) {
      this.logger.warn?.(`CACHE SET failed key=${key}`, {
        error,
      });
    } finally {
      this.metrics.increment(Metrics.CacheSetMsBucket, {
        bucket: this.bucket(Date.now() - t0),
      });
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const t0 = Date.now();
    try {
      const value = await this.redis.getJson<T>(key);
      const hit = value != null;

      this.logger.debug?.(`CACHE GET key=${key} -> ${hit ? 'HIT' : 'MISS'}`);
      this.metrics.increment(Metrics.CacheGetTotal, {
        hit: String(hit),
        type: 'json',
      });
      this.metrics.increment(Metrics.CacheGetMsBucket, {
        bucket: this.bucket(Date.now() - t0),
      });

      return value ?? undefined;
    } catch (error: unknown) {
      this.logger.warn?.(`CACHE GET failed key=${key}`, {
        error,
      });
      this.metrics.increment(Metrics.CacheGetTotal, {
        hit: 'false',
        type: 'json',
      });
      this.metrics.increment(Metrics.CacheGetMsBucket, {
        bucket: this.bucket(Date.now() - t0),
      });
      return undefined;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.delete(key);
      this.logger.debug?.(`CACHE DEL key=${key}`);
      this.metrics.increment(Metrics.CacheDelTotal);
    } catch (error: unknown) {
      this.logger.warn?.(`CACHE DEL failed key=${key}`, {
        error,
      });
    }
  }

  private bucket(ms: number): string {
    if (ms < 5) return '<5ms';
    if (ms < 20) return '<20ms';
    if (ms < 100) return '<100ms';
    if (ms < 500) return '<500ms';
    return '>=500ms';
  }
}
