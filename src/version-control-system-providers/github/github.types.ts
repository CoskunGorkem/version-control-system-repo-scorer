export interface GithubRepositoryOwner {
  login: string;
  id: number;
  node_id?: string;
  avatar_url: string;
  gravatar_id?: string;
  html_url: string;
  url?: string;
  followers_url?: string;
  following_url?: string;
  gists_url?: string;
  starred_url?: string;
  subscriptions_url?: string;
  organizations_url?: string;
  repos_url?: string;
  events_url?: string;
  received_events_url?: string;
  type?: string;
  site_admin?: boolean;
}

export interface GithubRepositoryLicense {
  key: string;
  name: string;
  url?: string;
  spdx_id?: string;
  node_id?: string;
  html_url?: string;
}

export interface GithubRepository {
  id: number;
  node_id?: string;
  name: string;
  full_name: string;
  private?: boolean;
  html_url: string;
  url?: string;
  stargazers_count: number;
  watchers_count?: number;
  forks_count: number;
  open_issues_count?: number;
  updated_at: string;
  created_at?: string;
  pushed_at?: string;
  language: string | null;
  description: string | null;
  homepage?: string | null;
  size?: number;
  fork?: boolean;
  default_branch?: string;
  score?: number; // GitHub search relevance score (not our computed score)
  archived?: boolean;
  disabled?: boolean;
  visibility?: string;
  owner: GithubRepositoryOwner;
  license?: GithubRepositoryLicense | null;
}

export interface GithubSearchReposResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GithubRepository[];
}
