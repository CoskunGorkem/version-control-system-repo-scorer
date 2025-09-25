import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  log(message: any, meta?: Record<string, unknown>) {
    if (meta) {
      console.log(new Date().toISOString(), '[INFO ]', String(message), meta);
    } else {
      console.log(new Date().toISOString(), '[INFO ]', String(message));
    }
  }

  error(message: any, meta?: Record<string, unknown>) {
    if (meta) {
      console.error(new Date().toISOString(), '[ERROR]', String(message), meta);
    } else {
      console.error(new Date().toISOString(), '[ERROR]', String(message));
    }
  }

  warn(message: any, meta?: Record<string, unknown>) {
    if (meta) {
      console.warn(new Date().toISOString(), '[WARN ]', String(message), meta);
    } else {
      console.warn(new Date().toISOString(), '[WARN ]', String(message));
    }
  }

  debug?(message: any, meta?: Record<string, unknown>) {
    if (meta) {
      console.debug(new Date().toISOString(), '[DEBUG]', String(message), meta);
    } else {
      console.debug(new Date().toISOString(), '[DEBUG]', String(message));
    }
  }

  verbose?(message: any, meta?: Record<string, unknown>) {
    if (meta) {
      console.info(new Date().toISOString(), '[VERBO]', String(message), meta);
    } else {
      console.info(new Date().toISOString(), '[VERBO]', String(message));
    }
  }

  withContext(context: string): LoggerService {
    const ctx = `[${context}]`;
    return {
      log: (m: any, meta?: Record<string, unknown>) =>
        meta
          ? console.log(
              new Date().toISOString(),
              '[INFO ]',
              ctx,
              String(m),
              meta,
            )
          : console.log(new Date().toISOString(), '[INFO ]', ctx, String(m)),
      error: (m: any, meta?: Record<string, unknown>) =>
        meta
          ? console.error(
              new Date().toISOString(),
              '[ERROR]',
              ctx,
              String(m),
              meta,
            )
          : console.error(new Date().toISOString(), '[ERROR]', ctx, String(m)),
      warn: (m: any, meta?: Record<string, unknown>) =>
        meta
          ? console.warn(
              new Date().toISOString(),
              '[WARN ]',
              ctx,
              String(m),
              meta,
            )
          : console.warn(new Date().toISOString(), '[WARN ]', ctx, String(m)),
      debug: (m: any, meta?: Record<string, unknown>) =>
        meta
          ? console.debug(
              new Date().toISOString(),
              '[DEBUG]',
              ctx,
              String(m),
              meta,
            )
          : console.debug(new Date().toISOString(), '[DEBUG]', ctx, String(m)),
      verbose: (m: any, meta?: Record<string, unknown>) =>
        meta
          ? console.info(
              new Date().toISOString(),
              '[VERBO]',
              ctx,
              String(m),
              meta,
            )
          : console.info(new Date().toISOString(), '[VERBO]', ctx, String(m)),
    };
  }
}
