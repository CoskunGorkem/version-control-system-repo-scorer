import { TestingModule } from '@nestjs/testing';
import { ScoringService } from './scoring.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { VcsRepository } from 'src/version-control-system-providers/shared/repository.types';
import { getTestModule, testProvider } from 'src/core/shared/test-providers';

function createMockRepo(partial: Partial<VcsRepository>): VcsRepository {
  return {
    id: partial.id ?? Math.floor(Math.random() * 1e6),
    name: partial.name ?? 'repo',
    full_name: partial.full_name ?? 'owner/repo',
    html_url: partial.html_url ?? 'https://example.com/repo',
    stargazers_count: partial.stargazers_count ?? 0,
    forks_count: partial.forks_count ?? 0,
    updated_at: partial.updated_at ?? new Date().toISOString(),
    language: partial.language ?? 'ts',
    description: partial.description ?? null,
    owner:
      partial.owner ??
      ({
        login: 'o',
        id: 1,
        avatar_url: '',
        html_url: '',
      } as VcsRepository['owner']),
    license: (partial.license ?? null) as VcsRepository['license'],
  } as VcsRepository;
}

describe('ScoringService', () => {
  let service: ScoringService;
  let withCtx: jest.Mock;
  let appLogger: Pick<AppLogger, 'withContext'>;

  beforeEach(async () => {
    jest.clearAllMocks();
    withCtx = jest.fn().mockReturnValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    });

    appLogger = { withContext: withCtx };
    const metrics = new MetricsService();

    const module: TestingModule = await getTestModule([
      ScoringService,
      testProvider(AppLogger, appLogger),
      testProvider(MetricsService, metrics),
    ]);

    service = module.get(ScoringService);
  });

  it('returns empty array for empty input', () => {
    expect(service.scoreRepositories([])).toEqual([]);
  });

  it('applies default weights and exposes them in breakdown', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2025-01-01T00:00:00Z').getTime());
    const repos = [
      createMockRepo({
        stargazers_count: 100,
        forks_count: 50,
        updated_at: '2024-12-01T00:00:00Z',
      }),
      createMockRepo({
        stargazers_count: 0,
        forks_count: 0,
        updated_at: '2024-12-31T00:00:00Z',
      }),
    ];
    const scored = service.scoreRepositories(repos);
    expect(scored).toHaveLength(2);
    expect(scored[0].breakdown.weights).toEqual({
      stars: 0.5,
      forks: 0.3,
      recency: 0.2,
    });
    expect(scored[1].breakdown.weights).toEqual({
      stars: 0.5,
      forks: 0.3,
      recency: 0.2,
    });
  });

  it('normalizes custom weights and clamps score within [0,1]', () => {
    const repos = [
      createMockRepo({ stargazers_count: 1000, forks_count: 1000 }),
      createMockRepo({ stargazers_count: 0, forks_count: 0 }),
    ];
    const scored = service.scoreRepositories(repos, {
      stars: 10,
      forks: 10,
      recency: 0,
    });
    for (const s of scored) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
      const w = s.breakdown.weights;
      const sum = Number((w.stars + w.forks + w.recency).toFixed(5));
      expect(sum).toBe(1);
    }
  });

  it('recency uses 90-day half-life (90d ago -> 0.5)', () => {
    const now = new Date('2025-01-01T00:00:00Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const repos = [
      createMockRepo({
        updated_at: new Date(now - ninetyDaysMs).toISOString(),
      }),
    ];
    const [s] = service.scoreRepositories(repos);
    expect(s.breakdown.recencyScore).toBe(0.5);
  });
});
