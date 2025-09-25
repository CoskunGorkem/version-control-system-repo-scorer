import { Environment } from 'src/core/shared/env.type';

export interface Config {
  server: {
    port: number;
    env: Environment;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    tls?: {
      enabled: boolean;
      rejectUnauthorized?: boolean;
    };
    enableReadyCheck?: boolean;
    maxRetriesPerRequest?: number;
  };
  github: {
    baseUrl: string;
    apiVersion: string;
    token: string;
    timeoutMs: number;
  };
  cache: {
    searchTtlMs: number;
    scoredTtlMs: number;
  };
}
