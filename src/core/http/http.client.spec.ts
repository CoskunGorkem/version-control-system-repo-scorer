import { HttpClient } from './http.client';

jest.mock('axios', () => {
  const request = jest.fn();
  const create = jest.fn(() => ({ request }));
  return {
    __esModule: true,
    default: { create },
  };
});

jest.mock('axios-retry', () => {
  return {
    __esModule: true,
    default: jest.fn(),
    isNetworkOrIdempotentRequestError: jest.fn(() => false),
  };
});

describe('HttpClient', () => {
  const axiosModule = jest.requireMock('axios');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should map axios response to HttpResponse', async () => {
    const mockResponse = {
      status: 200,
      data: { ok: true },
      headers: { h: 'v' },
    };
    axiosModule.default.create().request.mockResolvedValueOnce(mockResponse);

    const client = new HttpClient();
    const res = await client.request('GET', 'https://example.com');

    expect(res).toEqual({
      status: 200,
      data: { ok: true },
      headers: { h: 'v' },
    });

    const callArg = axiosModule.default.create().request.mock.calls[0][0];
    expect(callArg.method).toBe('GET');
    expect(callArg.url).toBe('https://example.com');
    expect(callArg.headers).toEqual({});
    expect(callArg).toHaveProperty('paramsSerializer');
  });

  it('should serialize params correctly and ignore null/undefined', async () => {
    axiosModule.default.create().request.mockResolvedValueOnce({
      status: 200,
      data: {},
      headers: {},
    });

    const client = new HttpClient();
    await client.request('GET', 'https://example.com', undefined, {
      params: {
        a: 1,
        b: undefined,
        c: null,
        d: ['x', 'y'],
      },
    });

    const callArg = axiosModule.default.create().request.mock.calls[0][0];

    // validate that params are passed and the serializer outputs expected string
    expect(callArg.params).toEqual({
      a: 1,
      b: undefined,
      c: null,
      d: ['x', 'y'],
    });
    const serialized = callArg.paramsSerializer.serialize(callArg.params);
    // Order is deterministic based on insertion in util
    expect(serialized).toBe('a=1&d=x&d=y');
  });

  it('should pass through timeout, headers, proxy, responseType, validateStatus', async () => {
    axiosModule.default.create().request.mockResolvedValueOnce({
      status: 201,
      data: 'ok',
      headers: { x: 'y' },
    });

    const client = new HttpClient();
    await client.request(
      'POST',
      'https://api.test',
      { id: 1 },
      {
        timeoutMs: 1234,
        headers: { Authorization: 'Bearer token' },
        proxy: { host: 'proxy.local', port: 8080 },
        responseType: 'json',
        validateStatus: (s) => s >= 200 && s < 400,
      },
    );

    const callArg = axiosModule.default.create().request.mock.calls[0][0];

    expect(callArg.method).toBe('POST');
    expect(callArg.url).toBe('https://api.test');
    expect(callArg.data).toEqual({ id: 1 });
    expect(callArg.timeout).toBe(1234);
    expect(callArg.headers).toEqual({ Authorization: 'Bearer token' });
    expect(callArg.proxy).toEqual({ host: 'proxy.local', port: 8080 });
    expect(callArg.responseType).toBe('json');
    expect(callArg.validateStatus(201)).toBe(true);
  });

  it('should apply retry overrides through axios-retry config on request', async () => {
    axiosModule.default.create().request.mockResolvedValueOnce({
      status: 200,
      data: {},
      headers: {},
    });

    const client = new HttpClient();
    await client.request('GET', 'https://retry.test', undefined, {
      retry: { retries: 3, delayMs: 500 },
    });

    const callArg = axiosModule.default.create().request.mock.calls[0][0];

    expect(callArg['axios-retry']).toBeDefined();
    expect(callArg['axios-retry'].retries).toBe(3);
    expect(typeof callArg['axios-retry'].retryDelay).toBe('function');
    expect(callArg['axios-retry'].retryDelay(10)).toBe(500);
  });
});
