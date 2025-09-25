import { Schema } from 'convict';
import { Environment } from 'src/core/shared/env.type';
import { Config } from './config.type';

export const ConfigSchema: Schema<Config> = {
  server: {
    port: {
      doc: 'The port to bind',
      format: 'port',
      default: 3000,
      env: 'PORT',
      arg: 'server.port',
    },
    env: {
      doc: 'The running deployment environment',
      default: Environment.Local,
      env: 'NODE_ENV',
      arg: 'server.env',
    },
  },
  redis: {
    host: {
      doc: 'Redis host',
      env: 'REDIS_HOST',
      arg: 'redis.host',
      default: '127.0.0.1',
    },
    port: {
      doc: 'Redis port',
      env: 'REDIS_PORT',
      arg: 'redis.port',
      default: 6379,
    },
    password: {
      doc: 'Redis password (optional)',
      env: 'REDIS_PASSWORD',
      arg: 'redis.password',
      default: '',
      sensitive: true,
    },
    db: {
      doc: 'Redis database index',
      env: 'REDIS_DB',
      arg: 'redis.db',
      default: 0,
      format: 'nat',
    },
    tls: {
      enabled: {
        doc: 'Enable TLS for Redis connection',
        env: 'REDIS_TLS_ENABLED',
        arg: 'redis.tls.enabled',
        default: false,
        format: Boolean,
      },
      rejectUnauthorized: {
        doc: 'Reject unauthorized TLS certs (set false for self-signed)',
        env: 'REDIS_TLS_REJECT_UNAUTHORIZED',
        arg: 'redis.tls.rejectUnauthorized',
        default: true,
        format: Boolean,
      },
    },
    enableReadyCheck: {
      doc: 'Enable ready check on Redis client',
      env: 'REDIS_ENABLE_READY_CHECK',
      arg: 'redis.enableReadyCheck',
      default: true,
      format: Boolean,
    },
    maxRetriesPerRequest: {
      doc: 'Max retries per request (ioredis)',
      env: 'REDIS_MAX_RETRIES_PER_REQUEST',
      arg: 'redis.maxRetriesPerRequest',
      default: 1,
      format: 'nat',
    },
  },
  github: {
    baseUrl: {
      doc: 'GitHub API base URL',
      env: 'GITHUB_API_BASE_URL',
      arg: 'github.baseUrl',
      default: 'https://api.github.com',
    },
    apiVersion: {
      doc: 'GitHub API version header',
      env: 'GITHUB_API_VERSION',
      arg: 'github.apiVersion',
      default: '2022-11-28',
    },
    token: {
      doc: 'GitHub token for authenticated requests',
      env: 'GITHUB_TOKEN',
      arg: 'github.token',
      default: '',
      sensitive: true,
    },
    timeoutMs: {
      doc: 'HTTP timeout for GitHub requests',
      env: 'GITHUB_TIMEOUT_MS',
      arg: 'github.timeoutMs',
      default: 5000,
      format: 'nat',
    },
  },
  cache: {
    searchTtlMs: {
      doc: 'TTL for raw GitHub search responses (ms)',
      env: 'CACHE_SEARCH_TTL_MS',
      arg: 'cache.searchTtlMs',
      default: 300000,
      format: 'nat',
    },
    scoredTtlMs: {
      doc: 'TTL for scored search responses (ms)',
      env: 'CACHE_SCORED_TTL_MS',
      arg: 'cache.scoredTtlMs',
      default: 600000,
      format: 'nat',
    },
  },
};
