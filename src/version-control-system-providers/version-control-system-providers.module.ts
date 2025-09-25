import { Module, Provider } from '@nestjs/common';
import { GithubProvider } from './github/github.provider';
import { GitlabProvider } from './gitlab/gitlab.provider';
import { HttpModule } from 'src/core/http/http.module';
import { CacheModule } from 'src/core/cache/cache.module';
import { ConfigModule } from 'src/core/config/config.module';
import { LoggerModule } from 'src/core/observability/logger.module';
import { BaseVersionControlSystemProvider } from './base-version-control-system.provider';
import { VcsProviderKind } from './shared/provider.types';

export const VersionControlSystemProvidersInjectionToken = Symbol(
  'VersionControlSystemProvidersInjectionToken',
);

const concreteProviders = [GithubProvider, GitlabProvider];

export class VcsProviderRegistry {
  private readonly map: Map<VcsProviderKind, BaseVersionControlSystemProvider>;

  constructor(providers: BaseVersionControlSystemProvider[]) {
    this.map = new Map();
    for (const p of providers) {
      const kind: VcsProviderKind | undefined = (p as any).kind;
      if (kind) this.map.set(kind, p);
    }
  }

  get(kind: VcsProviderKind): BaseVersionControlSystemProvider {
    const p = this.map.get(kind);
    if (!p) throw new Error(`VCS provider not found for kind=${kind}`);
    return p;
  }

  getDefault(): BaseVersionControlSystemProvider {
    return this.get(VcsProviderKind.Github);
  }
}

const providersArrayFactory: Provider = {
  provide: VersionControlSystemProvidersInjectionToken,
  useFactory: (...providers: BaseVersionControlSystemProvider[]) => providers,
  inject: [...concreteProviders],
};

const registryFactory: Provider = {
  provide: VcsProviderRegistry,
  useFactory: (providers: BaseVersionControlSystemProvider[]) =>
    new VcsProviderRegistry(providers),
  inject: [VersionControlSystemProvidersInjectionToken],
};

@Module({
  imports: [HttpModule, CacheModule, ConfigModule, LoggerModule],
  providers: [...concreteProviders, providersArrayFactory, registryFactory],
  exports: [...concreteProviders, providersArrayFactory, registryFactory],
})
export class VersionControlSystemProvidersModule {}
