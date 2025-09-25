import { HttpStatus } from '@nestjs/common';
import { BaseError } from '../base/base.error';

export class BadRequestError extends BaseError {
  constructor(
    message: string,
    opts?: {
      code?: string;
      internals?: unknown;
      details?: Record<string, unknown>;
      uid?: string;
    },
  ) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      opts?.code ?? 'BAD_REQUEST',
      opts?.uid,
      opts?.internals,
      opts?.details,
    );
  }
}

export class VCSRateLimitError extends BaseError {
  constructor(
    retryAfterSeconds: number,
    opts?: { uid?: string; responseHeaders?: Record<string, unknown> },
  ) {
    super(
      `VCS rate limit exceeded. Retry after ${retryAfterSeconds}s`,
      HttpStatus.TOO_MANY_REQUESTS,
      'VCS_RATE_LIMIT_EXCEEDED',
      opts?.uid,
      { retryAfterSeconds, responseHeaders: opts?.responseHeaders },
    );
  }
}

export class VCSApiError extends BaseError {
  constructor(
    statusCode: number,
    opts?: {
      uid?: string;
      response?: unknown;
      message?: string;
      code?: string;
    },
  ) {
    super(
      opts?.message ?? `VCS API error status=${statusCode}`,
      statusCode ?? HttpStatus.BAD_GATEWAY,
      opts?.code ?? 'VSC_API_ERROR',
      opts?.uid,
      { response: opts?.response, statusCode },
    );
  }
}

export class ExternalServiceUnavailableError extends BaseError {
  constructor(
    service: string,
    opts?: {
      message?: string;
      uid?: string;
      code?: string;
      response?: unknown;
      error?: unknown;
    },
  ) {
    super(
      opts?.message ?? `${service} unavailable`,
      HttpStatus.SERVICE_UNAVAILABLE,
      opts?.code ?? `${service.toUpperCase()}_UNAVAILABLE`,
      opts?.uid,
      { response: opts?.response, error: opts?.error, service },
    );
  }
}
