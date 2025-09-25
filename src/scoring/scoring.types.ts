import { VcsRepository } from 'src/version-control-system-providers/shared/repository.types';

export interface ScoringWeights {
  stars: number;
  forks: number;
  recency: number;
}

export interface ScoringBreakdown {
  normalizedStars: number; // 0..1
  normalizedForks: number; // 0..1
  recencyScore: number; // 0..1
  weights: ScoringWeights;
}

export interface ScoredRepository {
  repository: VcsRepository;
  score: number;
  breakdown: ScoringBreakdown;
}

export interface ScoredSearchResponse {
  totalCount: number;
  incompleteResults: boolean;
  items: ScoredRepository[];
}
