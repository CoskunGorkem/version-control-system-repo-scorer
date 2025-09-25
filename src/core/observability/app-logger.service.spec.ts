import { AppLogger } from './app-logger.service';

describe('AppLogger', () => {
  const original = { ...console } as Console;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log = original.log.bind(console);
    console.error = original.error.bind(console);
    console.warn = original.warn.bind(console);
    console.debug = original.debug.bind(console);
    console.info = original.info.bind(console);
  });

  it('basic methods write to console with tags', () => {
    const logger = new AppLogger();
    logger.log('hello');
    expect(console.log).toHaveBeenCalled();
    expect((console.log as jest.Mock).mock.calls[0][1]).toBe('[INFO ]');

    logger.error('oops');
    expect(console.error).toHaveBeenCalled();
    expect((console.error as jest.Mock).mock.calls[0][1]).toBe('[ERROR]');

    logger.warn('careful');
    expect(console.warn).toHaveBeenCalled();
    expect((console.warn as jest.Mock).mock.calls[0][1]).toBe('[WARN ]');

    logger.debug?.('dbg');
    expect(console.debug).toHaveBeenCalled();
    expect((console.debug as jest.Mock).mock.calls[0][1]).toBe('[DEBUG]');

    logger.verbose?.('verb');
    expect(console.info).toHaveBeenCalled();
    expect((console.info as jest.Mock).mock.calls[0][1]).toBe('[VERBO]');
  });

  it('passes meta as last argument when provided', () => {
    const logger = new AppLogger();
    const meta = { a: 1 };
    logger.log('m', meta);
    const args = (console.log as jest.Mock).mock.calls[0];
    expect(args[3]).toBe(meta);
  });

  it('withContext injects context token', () => {
    const logger = new AppLogger();
    const withCtx = logger.withContext('MyService');
    withCtx.log('x');
    const args = (console.log as jest.Mock).mock.calls[0];
    expect(args[2]).toBe('[MyService]');
    expect(args[3]).toBe('x');
  });
});
