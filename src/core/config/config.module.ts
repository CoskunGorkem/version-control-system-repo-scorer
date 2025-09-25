import { Global, Module } from '@nestjs/common';
import { ConfigService } from 'src/core/config/config.service';

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
