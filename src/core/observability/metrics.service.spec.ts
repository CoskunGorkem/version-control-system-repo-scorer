import { MetricsService } from './metrics.service';
import { Metrics } from './metrics.enum';

describe('MetricsService', () => {
  it('increment/add/gauge/observe are no-ops', () => {
    const m = new MetricsService();
    expect(() => m.increment(Metrics.CacheSetTotal)).not.toThrow();
    expect(() => m.add(Metrics.CacheSetTotal, 2)).not.toThrow();
    expect(() => m.gaugeSet(Metrics.CacheSetMsBucket, 1)).not.toThrow();
    expect(() => m.gaugeAdd(Metrics.CacheSetMsBucket, 1)).not.toThrow();
    expect(() => m.observe(Metrics.CacheSetMsBucket, 1)).not.toThrow();
  });

  it('startTimer returns a function that observes duration', () => {
    const m = new MetricsService();
    const spy = jest.spyOn(m, 'observe').mockImplementation(() => {});
    const stop = m.startTimer(Metrics.CacheGetMsBucket, { route: '/a' });
    stop();
    expect(spy).toHaveBeenCalled();
    const [metricName, value, labels] = spy.mock.calls[0];
    expect(metricName).toBe(Metrics.CacheGetMsBucket);
    expect(typeof value).toBe('number');
    expect(labels).toEqual({ route: '/a' });
  });
});
