import { LoggerService } from '@nestjs/common';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';

export abstract class BaseController {
  protected readonly logger: LoggerService;
  protected readonly metrics: MetricsService;

  constructor(appLogger: AppLogger, metrics: MetricsService) {
    const ctx = this.constructor?.name;
    this.logger = appLogger.withContext(ctx);
    this.metrics = metrics;
  }
}
