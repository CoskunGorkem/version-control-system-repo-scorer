import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import IORedis, { Redis, RedisOptions } from 'ioredis';
import { ConfigService } from '../config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const tlsEnabled = this.config.get<boolean>('redis.tls.enabled');
    const tlsRejectUnauthorized = this.config.get<boolean>(
      'redis.tls.rejectUnauthorized',
    );
    const enableReadyCheck = this.config.get<boolean>('redis.enableReadyCheck');
    const maxRetriesPerRequest =
      this.config.get<number>('redis.maxRetriesPerRequest') ?? 1;

    const options: RedisOptions = {
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      db: this.config.get<number>('redis.db'),
      enableOfflineQueue: false,
      enableReadyCheck,
      retryStrategy: (t) => Math.min(t * 200, 2000),
      maxRetriesPerRequest,
      lazyConnect: true,
      ...(tlsEnabled
        ? {
            tls: {
              rejectUnauthorized: tlsRejectUnauthorized,
            },
          }
        : {}),
    };

    this.client = new IORedis(options);
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  // Strings
  async setString(key: string, value: string, ttlSeconds?: number) {
    return ttlSeconds
      ? this.client.set(key, value, 'EX', ttlSeconds)
      : this.client.set(key, value);
  }
  async getString(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // JSON
  async setJson<T>(key: string, value: T, ttlSeconds?: number) {
    const payload = JSON.stringify(value);
    return ttlSeconds
      ? this.client.set(key, payload, 'EX', ttlSeconds)
      : this.client.set(key, payload);
  }
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // Housekeeping
  async delete(key: string) {
    return this.client.del(key);
  }
  async ttl(key: string) {
    return this.client.ttl(key);
  }
  async expire(key: string, ttlSeconds: number) {
    return this.client.expire(key, ttlSeconds);
  }
}
