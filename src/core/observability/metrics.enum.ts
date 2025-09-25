export enum Metrics {
  // Cache generic
  CacheSetTotal = 'cache_set_total',
  CacheSetMsBucket = 'cache_set_ms_bucket',
  CacheGetTotal = 'cache_get_total',
  CacheGetMsBucket = 'cache_get_ms_bucket',
  CacheDelTotal = 'cache_del_total',

  // GitHub service
  GithubSearchCacheHitTotal = 'github_search_cache_hit_total',
  GithubSearchCacheMissTotal = 'github_search_cache_miss_total',
  GithubSearch200Total = 'github_search_200_total',

  // Gitlab service values can also be introduced here in the future.

  // Search service
  SearchScoredCacheHitTotal = 'search_scored_cache_hit_total',
  SearchScoredCacheMissTotal = 'search_scored_cache_miss_total',
  SearchScored200Total = 'search_scored_200_total',
}
