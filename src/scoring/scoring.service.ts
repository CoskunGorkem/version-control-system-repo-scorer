import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/core/base/base.service';
import { AppLogger } from 'src/core/observability/app-logger.service';
import { MetricsService } from 'src/core/observability/metrics.service';
import { VcsRepository } from 'src/version-control-system-providers/shared/repository.types';
import {
  ScoredRepository,
  ScoringBreakdown,
  ScoringWeights,
} from './scoring.types';

@Injectable()
export class ScoringService extends BaseService {
  private readonly defaultWeights: ScoringWeights = {
    stars: 0.5,
    forks: 0.3,
    recency: 0.2,
  };

  constructor(appLogger: AppLogger, metrics: MetricsService) {
    super(appLogger, metrics);
  }

  scoreRepositories(
    repos: VcsRepository[],
    weights?: Partial<ScoringWeights>,
  ): ScoredRepository[] {
    if (!repos?.length) return [];

    // merge + normalize weights (defensive)
    const merged = { ...this.defaultWeights, ...weights } as ScoringWeights;
    const w = this.normalizeWeights(merged);

    // compute robust denominators for stars/forks using P95(log1p(values))
    const stats = this.computeStats(repos);

    const scored = repos.map((repo) => {
      const breakdown = this.computeBreakdown(repo, stats, w);
      const score = this.weightedScore(breakdown);
      return { repository: repo, score, breakdown };
    });
    return scored;
  }

  private normalizeWeights(w: ScoringWeights): ScoringWeights {
    const sum = (w.stars ?? 0) + (w.forks ?? 0) + (w.recency ?? 0);
    if (!sum) return { stars: 1, forks: 0, recency: 0 };
    return {
      stars: w.stars / sum,
      forks: w.forks / sum,
      recency: w.recency / sum,
    };
  }

  private computeStats(repos: VcsRepository[]) {
    const stars = repos.map((r) => Math.max(0, r.stargazers_count));
    const forks = repos.map((r) => Math.max(0, r.forks_count));

    const starDen = this.buildLogDenominator(stars, 95);
    const forkDen = this.buildLogDenominator(forks, 95);

    return { starDen, forkDen };
  }

  /**
   * Percentile-capped log normalization denominator:
   *  - log1p each value to compress big numbers
   *  - take P-th percentile of the logged values (default P95)
   *  - use as denominator (with tiny epsilon to avoid /0)
   */
  private buildLogDenominator(values: number[], p = 95): number {
    if (!values.length) return 1;
    const logs = values.map((v) => Math.log1p(v)).sort((a, b) => a - b);
    const idx = Math.min(
      logs.length - 1,
      Math.floor((p / 100) * (logs.length - 1)),
    );
    const cap = logs[idx];
    return Math.max(1e-9, cap);
  }

  private computeBreakdown(
    repo: VcsRepository,
    stats: { starDen: number; forkDen: number },
    weights: ScoringWeights,
  ): ScoringBreakdown {
    // Popularity (percentile-capped log normalization)
    const starsLog = Math.log1p(Math.max(0, repo.stargazers_count));
    const forksLog = Math.log1p(Math.max(0, repo.forks_count));

    const normalizedStars = Math.min(1, starsLog / stats.starDen);
    const normalizedForks = Math.min(1, forksLog / stats.forkDen);

    // Recency (half-life decay; 90 days)
    const updatedAtMs = Date.parse(repo.updated_at);
    let recencyScore = 0.5; // neutral default if date is bad
    if (!Number.isNaN(updatedAtMs)) {
      const ageDays = Math.max((Date.now() - updatedAtMs) / 86_400_000, 0);
      const halfLifeDays = 90;
      recencyScore = Math.pow(0.5, ageDays / halfLifeDays);
    }

    return {
      normalizedStars,
      normalizedForks,
      recencyScore,
      weights,
    };
  }

  private weightedScore(b: ScoringBreakdown): number {
    const { normalizedStars, normalizedForks, recencyScore, weights } = b;
    const raw =
      normalizedStars * weights.stars +
      normalizedForks * weights.forks +
      recencyScore * weights.recency;

    // values are rounding in the DTO layer
    return Math.max(0, Math.min(1, raw));
  }
}
