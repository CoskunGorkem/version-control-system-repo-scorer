import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/core/config/config.module';
import { VersionControlSystemProvidersModule } from 'src/version-control-system-providers/version-control-system-providers.module';
import { SearchModule } from 'src/search/search.module';

@Module({
  imports: [ConfigModule, VersionControlSystemProvidersModule, SearchModule],
})
export class AppModule {}
