import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { LoggerModule } from 'src/core/observability/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
