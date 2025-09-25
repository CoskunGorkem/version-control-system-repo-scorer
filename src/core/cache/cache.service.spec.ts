import { CacheService } from './cache.service';
import { RedisService } from './redis.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { Metrics } from 'src/core/observability/metrics.enum';
import { TestingModule } from '@nestjs/testing';
import { getTestModule, testProvider } from 'src/core/shared/test-providers';

describe('CacheService', () => {
  let redis: jest.Mocked<Pick<RedisService, 'setJson' | 'getJson' | 'delete'>>;
  let appLogger: Pick<AppLogger, 'withContext'>;
  let withCtx: jest.Mock;
  let metrics: Pick<
    MetricsService,
    'increment' | 'add' | 'gaugeSet' | 'gaugeAdd' | 'observe' | 'startTimer'
  >;
  let service: CacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    redis = {
      setJson: jest.fn(),
      getJson: jest.fn(),
      delete: jest.fn(),
    };

    withCtx = jest.fn().mockReturnValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    });

    appLogger = { withContext: withCtx };

    metrics = {
      increment: jest.fn(),
      add: jest.fn(),
      gaugeSet: jest.fn(),
      gaugeAdd: jest.fn(),
      observe: jest.fn(),
      startTimer: jest.fn(),
    };

    const module: TestingModule = await getTestModule([
      CacheService,
      testProvider(AppLogger, appLogger),
      testProvider(MetricsService, metrics),
      testProvider(RedisService, redis),
    ]);

    service = module.get(CacheService);
  });

  it('set() forwards ttlMs as ceil seconds and records metrics', async () => {
    const now = Date.now();
    const spyNow = jest.spyOn(Date, 'now');
    spyNow.mockReturnValueOnce(now); // t0
    spyNow.mockReturnValueOnce(now + 12); // t1 → <20ms bucket

    await service.set('k1', { v: 1 }, { ttlMs: 1500 });

    expect(redis.setJson).toHaveBeenCalledWith('k1', { v: 1 }, 2);
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheSetTotal, {
      type: 'json',
    });
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheSetMsBucket, {
      bucket: '<20ms',
    });
    const logger = withCtx.mock.results[0].value;
    expect(logger.debug).toHaveBeenCalledWith('CACHE SET key=k1 ttl=2');
  });

  it('set() with no ttlMs forwards undefined ttl', async () => {
    const now = Date.now();
    const spyNow = jest.spyOn(Date, 'now');
    spyNow.mockReturnValueOnce(now);
    spyNow.mockReturnValueOnce(now + 1); // <5ms bucket but 1ms

    await service.set('k2', { v: 2 });
    expect(redis.setJson).toHaveBeenCalledWith('k2', { v: 2 }, undefined);
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheSetMsBucket, {
      bucket: '<5ms',
    });
    const logger = withCtx.mock.results[0].value;
    expect(logger.debug).toHaveBeenCalledWith('CACHE SET key=k2 ttl=∞');
  });

  it('get() returns undefined for null and records hit/miss metrics', async () => {
    // Miss
    redis.getJson.mockResolvedValueOnce(null);
    let res = await service.get<{ x: number }>('missing');
    expect(res).toBeUndefined();
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheGetTotal, {
      hit: 'false',
      type: 'json',
    });

    // Hit
    const now = Date.now();
    const spyNow = jest.spyOn(Date, 'now');
    spyNow.mockReturnValueOnce(now);
    spyNow.mockReturnValueOnce(now + 7); // <20ms bucket
    redis.getJson.mockResolvedValueOnce({ x: 1 });
    res = await service.get<{ x: number }>('exists');
    expect(res).toEqual({ x: 1 });
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheGetTotal, {
      hit: 'true',
      type: 'json',
    });
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheGetMsBucket, {
      bucket: '<20ms',
    });
  });

  it('delete() deletes key and records metric', async () => {
    await service.delete('k3');
    expect(redis.delete).toHaveBeenCalledWith('k3');
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheDelTotal);
    const logger = withCtx.mock.results[0].value;
    expect(logger.debug).toHaveBeenCalledWith('CACHE DEL key=k3');
  });

  it('set() logs warn and records duration when redis fails', async () => {
    const err = new Error('boom');
    redis.setJson.mockRejectedValueOnce(err);

    const now = Date.now();
    const spyNow = jest.spyOn(Date, 'now');
    spyNow.mockReturnValueOnce(now);
    spyNow.mockReturnValueOnce(now + 6); // <20ms bucket

    await service.set('kf', { v: 9 }, { ttlMs: 1000 });

    const logger = withCtx.mock.results[0].value;
    expect(logger.warn).toHaveBeenCalledWith('CACHE SET failed key=kf', {
      error: err,
    });
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheSetMsBucket, {
      bucket: '<20ms',
    });
    expect(metrics.increment).not.toHaveBeenCalledWith(
      Metrics.CacheSetTotal,
      expect.anything(),
    );
  });

  it('get() returns undefined, logs warn and records miss when redis fails', async () => {
    const err = new Error('down');
    redis.getJson.mockRejectedValueOnce(err);

    const now = Date.now();
    const spyNow = jest.spyOn(Date, 'now');
    spyNow.mockReturnValueOnce(now);
    spyNow.mockReturnValueOnce(now + 3); // <5ms bucket

    const res = await service.get('kf-get');
    expect(res).toBeUndefined();
    const logger = withCtx.mock.results[0].value;
    expect(logger.warn).toHaveBeenCalledWith('CACHE GET failed key=kf-get', {
      error: err,
    });
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheGetTotal, {
      hit: 'false',
      type: 'json',
    });
    expect(metrics.increment).toHaveBeenCalledWith(Metrics.CacheGetMsBucket, {
      bucket: '<5ms',
    });
  });

  it('delete() logs warn and does not increment metric when redis fails', async () => {
    const err = new Error('oops');
    redis.delete.mockRejectedValueOnce(err);

    await service.delete('kf-del');
    const logger = withCtx.mock.results[0].value;
    expect(logger.warn).toHaveBeenCalledWith('CACHE DEL failed key=kf-del', {
      error: err,
    });
    expect(metrics.increment).not.toHaveBeenCalledWith(Metrics.CacheDelTotal);
  });
});
