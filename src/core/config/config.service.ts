import { Injectable } from '@nestjs/common';
import { Path } from 'convict';
import { Environment } from 'src/core/shared/env.type';
import { Config } from './config.type';
import { convictConfig } from './config';

@Injectable()
export class ConfigService {
  constructor() {
    convictConfig.validate({
      allowed: 'warn',
    });
  }

  get<T>(key: Path<Config>, opts: { parse?: boolean } = { parse: false }): T {
    const value = convictConfig.get(key) as unknown;
    if (opts.parse && value != null) {
      const asString =
        typeof value === 'string' ? value : JSON.stringify(value);
      try {
        return JSON.parse(asString) as T;
      } catch {
        return value as T;
      }
    }
    return value as T;
  }

  isLocal(): boolean {
    return [Environment.Local, Environment.Test].includes(
      this.get('server.env'),
    );
  }

  isProd(): boolean {
    return this.get('server.env') === Environment.Prod;
  }
}
