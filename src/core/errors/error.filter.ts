import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseError } from '../base/base.error';
import { isLocalEnv } from 'src/core/config/config';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof BaseError) {
      exception.path = exception.path ?? request?.url;
      exception.method = exception.method ?? request?.method;
      const payload = exception.toJson();
      if (!isLocalEnv) {
        delete payload.stack;
        delete payload.internal;
      }
      response.status(exception.status).json(payload);
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      path: request?.url,
      method: request?.method,
    });
  }
}
