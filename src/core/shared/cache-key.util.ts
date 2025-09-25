import { createHash } from 'crypto';
import { CacheKeyPrefix } from './cache-keys';

type JsonLike =
  | undefined
  | null
  | boolean
  | number
  | string
  | JsonLike[]
  | { [k: string]: JsonLike };

export function stableStringify(value: unknown): string {
  return stringifySorted(value as JsonLike);
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function buildCacheKey(prefix: string, payload: unknown): string {
  const body = stableStringify(payload);
  return `${prefix}:${sha256Hex(body)}`;
}

export function buildProviderAwareKey(
  prefix: CacheKeyPrefix,
  payload: unknown,
): string {
  const body = stableStringify(payload);
  return `${prefix}:${sha256Hex(body)}`;
}

function stringifySorted(value: JsonLike): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number' || t === 'boolean') return JSON.stringify(value);
  if (t === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return (
      '[' +
      value
        .map((v) => (v === undefined ? 'null' : stringifySorted(v as JsonLike)))
        .join(',') +
      ']'
    );
  }
  const obj = value as { [k: string]: JsonLike };
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${stringifySorted(obj[k])}`,
  );
  return '{' + entries.join(',') + '}';
}
