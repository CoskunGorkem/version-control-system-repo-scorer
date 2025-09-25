import IORedis, { Redis } from 'ioredis';
import { RedisService } from './redis.service';
import { ConfigService } from '../config/config.service';
import { Path } from 'convict';
import { Config } from '../config/config.type';

jest.mock('ioredis', () => {
  const ctor = jest.fn();
  return { __esModule: true, default: ctor };
});

describe('RedisService', () => {
  const RedisCtor = IORedis as unknown as jest.Mock;
  type RedisClientStub = {
    connect: jest.Mock<Promise<void>, []>;
    quit: jest.Mock<Promise<void>, []>;
    disconnect: jest.Mock<void, []>;
    set: jest.Mock<Promise<'OK'>>;
    get: jest.Mock<Promise<string | null>>;
    del: jest.Mock<Promise<number>>;
    ttl: jest.Mock<Promise<number>>;
    expire: jest.Mock<Promise<number>>;
  };
  let mockClient: RedisClientStub;
  let config: ConfigService;
  let service: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(10),
      expire: jest.fn().mockResolvedValue(1),
    };
    RedisCtor.mockReturnValue(mockClient as unknown as Redis);

    const values = {
      'redis.host': 'localhost',
      'redis.port': 6379,
      'redis.password': 'pass',
      'redis.db': 0,
      'redis.maxRetriesPerRequest': 1,
    } as const;
    const getImpl: ConfigService['get'] = <T>(key: Path<Config>): T =>
      values[key as keyof typeof values] as unknown as T;
    config = {
      get: jest.fn(getImpl),
      isLocal: jest.fn(() => false),
      isProd: jest.fn(() => false),
    } as ConfigService;

    service = new RedisService(config);
  });

  it('onModuleInit creates client with config and connects', async () => {
    await service.onModuleInit();
    expect(RedisCtor).toHaveBeenCalledTimes(1);
    const opts = RedisCtor.mock.calls[0][0];
    expect(opts).toMatchObject({
      host: 'localhost',
      port: 6379,
      password: 'pass',
      db: 0,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    expect(typeof opts.retryStrategy).toBe('function');
    expect(mockClient.connect).toHaveBeenCalled();
  });

  it('onModuleDestroy quits cleanly when client exists', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(mockClient.quit).toHaveBeenCalled();
    expect(mockClient.disconnect).not.toHaveBeenCalled();
  });

  it('onModuleDestroy disconnects when quit throws', async () => {
    await service.onModuleInit();
    mockClient.quit.mockRejectedValueOnce(new Error('boom'));
    await service.onModuleDestroy();
    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it('setString uses EX when ttl provided', async () => {
    await service.onModuleInit();
    await service.setString('k', 'v', 5);
    expect(mockClient.set).toHaveBeenCalledWith('k', 'v', 'EX', 5);
  });

  it('setString without ttl omits EX', async () => {
    await service.onModuleInit();
    await service.setString('k', 'v');
    expect(mockClient.set).toHaveBeenCalledWith('k', 'v');
  });

  it('getString returns value', async () => {
    await service.onModuleInit();
    mockClient.get.mockResolvedValueOnce('val');
    await expect(service.getString('k')).resolves.toBe('val');
  });

  it('setJson stringifies and sets with ttl', async () => {
    await service.onModuleInit();
    await service.setJson('k', { a: 1 }, 2);
    expect(mockClient.set).toHaveBeenCalledWith(
      'k',
      JSON.stringify({ a: 1 }),
      'EX',
      2,
    );
  });

  it('getJson parses json and handles null/invalid', async () => {
    await service.onModuleInit();
    // null
    mockClient.get.mockResolvedValueOnce(null);
    await expect(service.getJson('k')).resolves.toBeNull();
    // valid
    mockClient.get.mockResolvedValueOnce('{"a":1}');
    await expect(service.getJson('k')).resolves.toEqual({ a: 1 });
    // invalid
    mockClient.get.mockResolvedValueOnce('{oops');
    await expect(service.getJson('k')).resolves.toBeNull();
  });

  it('delete, ttl, expire forward to client', async () => {
    await service.onModuleInit();
    await service.delete('k');
    expect(mockClient.del).toHaveBeenCalledWith('k');
    await service.ttl('k');
    expect(mockClient.ttl).toHaveBeenCalledWith('k');
    await service.expire('k', 7);
    expect(mockClient.expire).toHaveBeenCalledWith('k', 7);
  });
});
