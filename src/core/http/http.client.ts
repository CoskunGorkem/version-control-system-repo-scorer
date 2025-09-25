import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, Method } from 'axios';
import axiosRetry from 'axios-retry';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { HttpRequestOptions, HttpResponse } from 'src/core/http/http.types';

@Injectable()
export class HttpClient {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 5000,
      httpAgent: new HttpAgent({ keepAlive: true }),
      httpsAgent: new HttpsAgent({ keepAlive: true }),
    });

    axiosRetry(this.client, {
      retries: 0,
      retryCondition: (error) => {
        const status = error.response?.status;
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          status === 429 ||
          (status != null && status >= 500)
        );
      },
      retryDelay: (retryCount) => Math.min(1000 * retryCount, 3000),
    });
  }

  async request<T = unknown>(
    method: Method,
    url: string,
    data?: unknown,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>> {
    const retries = options?.retry?.retries ?? 0;
    const strategy =
      options?.retry?.strategy ??
      (options?.retry?.delayMs ? 'fixed' : 'exponential_jitter');
    const baseDelayMs = options?.retry?.baseDelayMs ?? 500;
    const maxDelayMs = options?.retry?.maxDelayMs ?? 3000;
    const fixedDelay = options?.retry?.delayMs ?? baseDelayMs;

    const computeDelay = (attempt: number): number => {
      if (strategy === 'fixed') return fixedDelay;
      // exponential backoff with full jitter
      const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      return Math.floor(Math.random() * exp);
    };

    const response = await this.client.request<T>({
      method,
      url,
      data,
      params: options?.params,
      timeout: options?.timeoutMs,
      responseType: options?.responseType,
      validateStatus: options?.validateStatus,
      headers: {
        ...(options?.headers ?? {}),
      },
      proxy: options?.proxy,
      signal: options?.signal,
      paramsSerializer: {
        serialize: (params) => {
          const usp = new URLSearchParams();
          Object.entries(params ?? {}).forEach(([k, v]) => {
            if (v === undefined || v === null) return;
            if (Array.isArray(v))
              v.forEach((item) => usp.append(k, String(item)));
            else usp.append(k, String(v));
          });
          return usp.toString();
        },
      },
      'axios-retry': {
        retries,
        retryDelay:
          retries > 0
            ? (retryCount: number) => computeDelay(retryCount)
            : undefined,
      },
    });

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  }
}
