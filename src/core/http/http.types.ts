export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RetryOptions {
  retries?: number; // number of retry attempts
  delayMs?: number; // fixed delay between retries (deprecated; prefer baseDelayMs)
  strategy?: 'fixed' | 'exponential_jitter';
  baseDelayMs?: number; // base delay for backoff (default 500ms)
  maxDelayMs?: number; // max cap for delay (default 3000ms)
}

export interface ProxyAuthConfig {
  username: string;
  password: string;
}

export interface ProxyConfig {
  host: string;
  port: number;
  protocol?: 'http' | 'https';
  auth?: ProxyAuthConfig;
}

export type ResponseType = 'json' | 'text' | 'arraybuffer' | 'stream';

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeoutMs?: number;
  responseType?: ResponseType;
  retry?: RetryOptions;
  proxy?: ProxyConfig;
  validateStatus?: (status: number) => boolean;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers?: Record<string, unknown>;
}
