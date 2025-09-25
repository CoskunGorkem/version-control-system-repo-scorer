import { Module, Logger } from '@nestjs/common';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { LoggingInterceptor } from 'src/core/observability/logging.interceptor';

@Module({
  providers: [Logger, AppLogger, MetricsService, LoggingInterceptor],
  exports: [Logger, AppLogger, MetricsService, LoggingInterceptor],
})
export class LoggerModule {}
