import { ConfigService } from './config.service';
import { convictConfig } from './config';
import { TestingModule } from '@nestjs/testing';
import { getTestModule } from 'src/core/shared/test-providers';

jest.mock('./config', () => {
  const get = jest.fn();
  const validate = jest.fn();
  return { __esModule: true, convictConfig: { get, validate } };
});

describe('ConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates on construct', async () => {
    await getTestModule([ConfigService]);
    expect(convictConfig.validate).toHaveBeenCalledWith({
      allowed: 'warn',
    });
  });

  it('get() returns raw or parsed JSON based on opts', async () => {
    convictConfig.get.mockReturnValueOnce('42');
    const module: TestingModule = await getTestModule([ConfigService]);
    const service = module.get(ConfigService);
    expect(service.get<any>('server.port')).toBe('42');

    convictConfig.get.mockReturnValueOnce('{"a":1}');
    expect(service.get<any>('any.key', { parse: true })).toEqual({ a: 1 });
  });

  it('isLocal() true for Local/Test envs', async () => {
    convictConfig.get.mockReturnValueOnce('local');
    const module: TestingModule = await getTestModule([ConfigService]);
    const service = module.get(ConfigService);
    expect(service.isLocal()).toBe(true);
  });

  it('isProd() true only for production', async () => {
    convictConfig.get.mockReturnValueOnce('production');
    const module: TestingModule = await getTestModule([ConfigService]);
    const service = module.get(ConfigService);
    expect(service.isProd()).toBe(true);
  });
});
