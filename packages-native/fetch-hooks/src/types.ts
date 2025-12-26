/** Request data used for hashing and storage */
export interface HashableRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string | undefined
}

// ============================================================================
// Storage Abstraction
// ============================================================================

/** Key type for cache storage: [cacheKey, optionalRequestContext] */
export type CacheKey = [key: string, request?: HashableRequest]

/** Generic key-value storage interface */
export interface KV<K, V> {
  get(key: K): Promise<V | null>
  set(key: K, value: V): Promise<void>
  has(key: K): Promise<boolean>
  delete?(key: K): Promise<void>
}

/** Generic streaming key-value storage interface */
export interface KVStream<K, V> {
  get(key: K): AsyncIterable<V>
  set(key: K, values: V[] | AsyncIterable<V>): Promise<void>
  has(key: K): Promise<boolean>
  delete?(key: K): Promise<void>
}

/** Composed cache storage using specialized KV stores for each data type */
export interface CacheStorage {
  requests: KV<CacheKey, CachedRequest>
  responseMeta: KV<CacheKey, CachedResponseMeta>
  responseBody: KV<CacheKey, string>
  binaryBody: KV<CacheKey, Uint8Array>
  sseChunks: KVStream<CacheKey, TimedChunk>
}

/** Transform hook that can be sync or async */
export type TransformHook<T> = (value: T) => T | Promise<T>

/** Generator transform hook for streaming data */
export type GeneratorTransformHook<T> = (
  chunks: AsyncIterable<T>,
) => AsyncIterable<T>

/** Response data for storage hooks */
export interface StorableResponse {
  body?: string | undefined
  meta: CachedResponseMeta
}

export interface CacheOptions {
  cacheDir?: string
  recordOnly?: boolean
  replayOnly?: boolean
  /** Custom storage implementation. Defaults to filesystem storage. */
  storage?: CacheStorage
  /** Fetch function for internal use (dev-fs-logs). Defaults to baseFetch. */
  internalFetch?: typeof globalThis.fetch
  /** Transform request data before hashing (affects cache key). Defaults to identity. */
  beforeHash?: TransformHook<HashableRequest>
  /** Transform request data before storing to disk. Defaults to identity. */
  beforeStoreRequest?: TransformHook<HashableRequest>
  /** Transform response data before storing to disk. Defaults to identity. */
  beforeStoreResponse?: TransformHook<StorableResponse>
  /** Transform response data after loading from cache. Defaults to identity. */
  afterLoadResponse?: TransformHook<StorableResponse>
  /** Transform SSE chunks during replay. Async generator receives and yields TimedChunks. */
  transformSSEChunk?: GeneratorTransformHook<TimedChunk>
  /** Transform the cache key after hashing. Use to add product-specific prefixes/suffixes to filenames. */
  transformCacheKey?: (cacheKey: string, request: HashableRequest) => string
}

export interface CachedRequestBody {
  json?: unknown
  text?: string
}

/** Raw request data before body parsing (internal use) */
export interface RawCachedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string | undefined
}

/** Cached request with parsed body (stored to disk) */
export interface CachedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: CachedRequestBody | undefined
}

export interface TimedChunk {
  data: string
  delay_ms: number
}

/**
 * JSONL format for SSE cache files.
 * Each line is one of:
 * - {json: unknown} - parsed JSON payload from SSE data field
 * - {text: string} - raw text payload when JSON parsing fails (e.g., "[DONE]")
 * - {comment: string} - SSE comment line (starts with ':'), used for keep-alive/status
 * - {delay_ms: number} - timing between events (can be stripped with grep -v delay_ms)
 */
export type JsonlRecord =
  | {
      json: unknown
    }
  | {
      text: string
    }
  | {
      comment: string
    }
  | {
      delay_ms: number
    }

export interface CachedResponseMeta {
  status: number
  statusText: string
  headers: Record<string, string>
  ttfb_ms: number
  total_ms: number
  is_sse: boolean
  is_binary: boolean
  cached_at: string
}

export interface BinaryResponseMeta extends CachedResponseMeta {
  is_binary: true
  content_type: string
  size: number
}
