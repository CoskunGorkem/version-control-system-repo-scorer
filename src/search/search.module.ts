import { Module } from '@nestjs/common';
import { VersionControlSystemProvidersModule } from 'src/version-control-system-providers/version-control-system-providers.module';
import { CacheModule } from 'src/core/cache/cache.module';
import { ConfigModule } from 'src/core/config/config.module';
import { LoggerModule } from 'src/core/observability/logger.module';
import { ScoringModule } from 'src/scoring/scoring.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    VersionControlSystemProvidersModule,
    CacheModule,
    ConfigModule,
    LoggerModule,
    ScoringModule,
  ],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
