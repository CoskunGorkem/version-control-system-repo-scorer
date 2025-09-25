import { Injectable } from '@nestjs/common';
import { Metrics } from './metrics.enum';

type MetricLabels = Record<string, string>;

/**
 * Placeholder metrics service.
 *
 * This is intentionally a no-op facade that defines a stable API for counters,
 * gauges, observations, and simple timers. In the future, you can wire these
 * methods to a real telemetry backend (e.g., Prometheus, OpenTelemetry)
 * without changing call sites across the codebase.
 */
@Injectable()
export class MetricsService {
  increment(_metricName: Metrics, _labels?: MetricLabels, _value = 1): void {}

  add(metricName: Metrics, value: number, labels?: MetricLabels): void {
    this.increment(metricName, labels, value);
  }

  gaugeSet(
    _metricName: Metrics,
    _value: number,
    _labels?: MetricLabels,
  ): void {}

  gaugeAdd(
    _metricName: Metrics,
    _delta: number,
    _labels?: MetricLabels,
  ): void {}

  observe(_metricName: Metrics, _value: number, _labels?: MetricLabels): void {}

  startTimer(metricName: Metrics, labels?: MetricLabels): () => void {
    const start = Date.now();
    return () => {
      const durationMs = Date.now() - start;
      this.observe(metricName, durationMs, labels);
    };
  }
}
