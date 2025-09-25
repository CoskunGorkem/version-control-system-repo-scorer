import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { AppLogger } from 'src/core/observability/app-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly appLogger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const method: string = req?.method;
    const url: string = req?.originalUrl ?? req?.url;
    const controller = context.getClass()?.name;
    const handler = context.getHandler()?.name;

    const logger = this.appLogger.withContext('HTTP');

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - now;
          const status = res?.statusCode ?? 0;
          logger.log?.(
            `[${method}] ${url} ${status} ${ms}ms (${controller} ${handler})`,
          );
        },
        error: (err: unknown) => {
          const ms = Date.now() - now;
          const status = res?.statusCode ?? 0;
          logger.error?.(
            `[${method}] ${url} ${status} ${ms}ms (${controller}#${handler}) -> ${err instanceof Error ? err.message : String(err)}`,
          );
        },
      }),
    );
  }
}
