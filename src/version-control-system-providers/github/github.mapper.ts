import { GithubRepository } from './github.types';
import {
  VcsRepository,
  VcsRepositoryLicense,
  VcsRepositoryOwner,
} from 'src/version-control-system-providers/shared/repository.types';

export function mapGithubRepoToVcsRepository(
  repo: GithubRepository,
): VcsRepository {
  const owner: VcsRepositoryOwner = {
    login: repo.owner.login,
    id: repo.owner.id,
    avatar_url: repo.owner.avatar_url,
    html_url: repo.owner.html_url,
  };

  const license: VcsRepositoryLicense | null = repo.license
    ? {
        key: repo.license.key,
        name: repo.license.name,
        url: repo.license.url,
        spdx_id: repo.license.spdx_id,
        node_id: repo.license.node_id,
        html_url: repo.license.html_url,
      }
    : null;

  return {
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    html_url: repo.html_url,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    updated_at: repo.updated_at,
    created_at: repo.created_at,
    language: repo.language,
    description: repo.description,
    owner,
    license,
  };
}
