import { BaseService } from './base.service';
import { LoggerService } from '@nestjs/common';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';

class DemoService extends BaseService {
  constructor(appLogger: AppLogger, metrics: MetricsService) {
    super(appLogger, metrics);
  }

  public getLogger() {
    return this.logger;
  }

  public getMetrics() {
    return this.metrics;
  }
}

describe('BaseService', () => {
  it('creates context-bound logger and stores metrics', () => {
    const logger: LoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const appLogger = new AppLogger();
    const withContextSpy = jest
      .spyOn(appLogger, 'withContext')
      .mockReturnValue(logger);

    const metrics = new MetricsService();

    const service = new DemoService(appLogger, metrics);
    expect(withContextSpy).toHaveBeenCalledWith('DemoService');
    expect(service.getLogger()).toBe(logger);
    expect(service.getMetrics()).toBe(metrics);
  });
});
