export interface VcsRepositoryOwner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface VcsRepositoryLicense {
  key: string;
  name: string;
  url?: string;
  spdx_id?: string;
  node_id?: string;
  html_url?: string;
}

export interface VcsRepository {
  id: number;
  full_name: string;
  name: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at?: string;
  language: string | null;
  description: string | null;
  owner: VcsRepositoryOwner;
  license?: VcsRepositoryLicense | null;
}

export interface VcsSearchReposResponse {
  total_count: number;
  incomplete_results: boolean;
  items: VcsRepository[];
}
