import { Module } from '@nestjs/common';
import { CacheService } from 'src/core/cache/cache.service';
import { RedisService } from 'src/core/cache/redis.service';
import { ConfigModule } from 'src/core/config/config.module';
import { LoggerModule } from 'src/core/observability/logger.module';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [RedisService, CacheService],
  exports: [CacheService],
})
export class CacheModule {}
