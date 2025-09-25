import { Provider } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

export const getTestModule = async (
  providers: Provider[],
): Promise<TestingModule> => Test.createTestingModule({ providers }).compile();

export const testProvider = <T>(
  token: any,
  overwrite?: Partial<T>,
): Provider => ({
  provide: token,
  useValue: (overwrite ?? {}) as T,
});
