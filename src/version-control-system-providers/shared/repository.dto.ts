import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  VcsRepository,
  VcsRepositoryLicense,
  VcsRepositoryOwner,
} from './repository.types';

export class VcsRepositoryOwnerDto {
  @ApiProperty()
  login: string;

  @ApiProperty()
  id: number;

  @ApiProperty()
  avatar_url: string;

  @ApiProperty()
  html_url: string;

  static from(owner: VcsRepositoryOwner): VcsRepositoryOwnerDto {
    const dto = new VcsRepositoryOwnerDto();
    dto.login = owner.login;
    dto.id = owner.id;
    dto.avatar_url = owner.avatar_url;
    dto.html_url = owner.html_url;
    return dto;
  }
}

export class VcsLicenseDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  spdx_id?: string;

  @ApiPropertyOptional()
  node_id?: string;

  @ApiPropertyOptional()
  html_url?: string;

  static from(license?: VcsRepositoryLicense | null): VcsLicenseDto | null {
    if (!license) return null;
    const dto = new VcsLicenseDto();
    dto.key = license.key;
    dto.name = license.name;
    dto.url = license.url;
    dto.spdx_id = license.spdx_id;
    dto.node_id = license.node_id;
    dto.html_url = license.html_url;
    return dto;
  }
}

export class VcsRepositoryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  htmlUrl: string;

  @ApiProperty({ nullable: true, type: String })
  description: string | null;

  @ApiProperty({ nullable: true, type: String })
  language: string | null;

  @ApiProperty()
  stargazersCount: number;

  @ApiProperty()
  forksCount: number;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({ nullable: true, type: () => VcsLicenseDto })
  @Type(() => VcsLicenseDto)
  license?: VcsLicenseDto | null;

  static from(repo: VcsRepository): VcsRepositoryDto {
    const dto = new VcsRepositoryDto();
    dto.id = repo.id;
    dto.fullName = repo.full_name;
    dto.name = repo.name;
    dto.htmlUrl = repo.html_url;
    dto.description = repo.description;
    dto.language = repo.language;
    dto.stargazersCount = repo.stargazers_count;
    dto.forksCount = repo.forks_count;
    dto.updatedAt = repo.updated_at ?? '';
    dto.createdAt = repo.created_at ?? '';
    dto.license = VcsLicenseDto.from(repo.license);
    return dto;
  }
}
