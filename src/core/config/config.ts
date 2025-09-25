import * as convict from 'convict';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { Environment } from 'src/core/shared/env.type';
import { ConfigSchema } from './config.schema';

const defaultEnv = '' as const;
const env = process.env.NODE_ENV ?? defaultEnv;
const envFilePath = join(__dirname, '../../', `.env${env ? `.${env}` : ''}`);

if (existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
} else {
  dotenv.config();
}

export const convictConfig = convict(ConfigSchema);
export const config = convictConfig.getProperties();
export const isLocalEnv = [Environment.Local, Environment.Test].includes(
  config.server.env,
);
