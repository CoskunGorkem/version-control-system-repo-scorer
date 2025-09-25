import { HttpStatus } from '@nestjs/common';

export class BaseError extends Error {
  timestamp = new Date();

  constructor(
    message: string,
    public readonly status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public uid?: string,
    public internal?: unknown,
    public details?: Record<string, unknown>,
    public skipLogging?: boolean,
    public path?: string,
    public method?: string,
  ) {
    super(message);
    this.code = `APP_${code ?? 'INTERNAL_ERROR'}`;
    this.name = this.constructor.name;
    this.uid = uid;
    this.internal = internal;
    this.details = details;
    this.skipLogging = skipLogging;
    this.path = path;
    this.method = method;
  }

  toJson(meta: Record<string, unknown> = {}): Record<string, any> {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.status,
      timestamp: this.timestamp.toISOString(),
      uid: this.uid,
      internal: this.internal,
      stack: this.stack,
      name: this.name,
      path: this.path,
      method: this.method,
      ...(this.details ?? {}),
      ...meta,
    };
  }
}
