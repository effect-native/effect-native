import type { CacheOptions, CacheStorage } from "./types"

import {
  getCachedResponse,
  getCacheKeyFromUrl,
  setInternalFetchForCache,
  storeRequest,
  storeResponse
} from "./cache-manager"
import { getCacheDir, isCacheEnabled, isProduction, isReplayOnly } from "./environment"
import { createFilesystemStorage } from "./filesystem-storage"
import { hashRequest, headersToRecord } from "./request-hasher"

// Only export the public API - internal implementation details are not exported
export type {
  CacheKey,
  CacheOptions,
  CacheStorage,
  GeneratorTransformHook,
  HashableRequest,
  KV,
  KVStream,
  StorableResponse,
  TimedChunk,
  TransformHook
} from "./types"

// Export storage factories for custom implementations
export { createFilesystemStorage } from "./filesystem-storage"
export { createFlatFileStorage } from "./flat-file-storage"

const CACHE_ENABLED_BANNER = `
╔══════════════════════════════════════════════════════════════╗
║  DEV-FETCH-CACHE ENABLED                                     ║
║  Responses are being cached/replayed from .cache/fetch/      ║
║  To disable: DEV_FETCH_CACHE=0 or --no-fetch-cache           ║
╚══════════════════════════════════════════════════════════════╝
`

let originalFetch: typeof globalThis.fetch | null = null

function getUrlFromInput(input: Request | string | URL): string {
  if (typeof input === "string") {
    return input
  }
  if (input instanceof URL) {
    return input.href
  }
  return input.url
}

function normalizeHeadersInit(headersInit: unknown): Record<string, string> {
  if (!headersInit) {
    return {}
  }
  if (headersInit instanceof Headers) {
    return headersToRecord(headersInit)
  }
  if (Array.isArray(headersInit)) {
    return Object.fromEntries(headersInit)
  }
  return headersInit as Record<string, string>
}

async function extractBodyInit(bodyInit: RequestInit["body"]): Promise<string | undefined> {
  if (!bodyInit) {
    return undefined
  }
  if (typeof bodyInit === "string") {
    return bodyInit
  }
  if (bodyInit instanceof URLSearchParams) {
    return bodyInit.toString()
  }
  if (bodyInit instanceof Blob) {
    return bodyInit.text()
  }
  if (bodyInit instanceof FormData) {
    const pairs: Array<string> = []
    for (const [key, value] of bodyInit.entries()) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
    return pairs.join("&")
  }
  if (bodyInit instanceof ArrayBuffer) {
    return new TextDecoder().decode(bodyInit)
  }
  if (ArrayBuffer.isView(bodyInit)) {
    return new TextDecoder().decode(new Uint8Array(bodyInit.buffer, bodyInit.byteOffset, bodyInit.byteLength))
  }
  if (bodyInit instanceof ReadableStream) {
    const reader = bodyInit.getReader()
    const chunks: Array<Uint8Array> = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    return new TextDecoder().decode(combined)
  }
  return undefined
}

/** Default identity transform hook */
const identity = <T>(value: T): T => value

export function createCachedFetch(baseFetch: typeof globalThis.fetch, options?: CacheOptions) {
  const replayOnly = options?.replayOnly ?? isReplayOnly()
  const beforeHash = options?.beforeHash ?? identity
  const beforeStoreRequest = options?.beforeStoreRequest ?? identity
  const transformCacheKey = options?.transformCacheKey ?? ((key: string) => key)

  // Create or use provided storage
  const storage: CacheStorage = options?.storage ?? createFilesystemStorage(getCacheDir())

  // Set internal fetch for dev-fs-logs communication (defaults to baseFetch)
  setInternalFetchForCache(options?.internalFetch ?? baseFetch)

  return async function cachedFetch(input: Request | string | URL, init?: RequestInit): Promise<Response> {
    if (isProduction()) {
      return baseFetch(input, init)
    }

    const url = getUrlFromInput(input)

    // Skip caching for localhost requests (including dev-fs-logs on port 1090)
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      return baseFetch(input, init)
    }

    const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")

    const cacheKeyFromUrl = getCacheKeyFromUrl(url)
    if (cacheKeyFromUrl) {
      const cached = await getCachedResponse(
        cacheKeyFromUrl,
        options?.afterLoadResponse,
        options?.transformSSEChunk,
        storage
      )
      if (cached) {
        return cached
      }
      return new Response("Cache entry not found", {
        status: 404
      })
    }

    const headersInit = init?.headers ?? (typeof input === "object" && "headers" in input ? input.headers : undefined)
    const headers = normalizeHeadersInit(headersInit)

    let body: string | undefined

    // Extract body from Request object or init
    if (input instanceof Request && input.body) {
      // Clone the request so we can read the body without consuming the original
      const clonedRequest = input.clone()
      body = await extractBodyInit(clonedRequest.body!)
    } else if (init?.body !== null && init?.body !== undefined) {
      body = await extractBodyInit(init.body)
    }

    // Apply beforeHash transform to affect cache key generation, then transformCacheKey for custom prefixes/suffixes
    const hashableRequest = await beforeHash({ url, method, headers, body })
    const cacheKey = transformCacheKey(hashRequest(hashableRequest), hashableRequest)

    const cached = await getCachedResponse(
      cacheKey,
      options?.afterLoadResponse,
      options?.transformSSEChunk,
      storage
    )
    if (cached) {
      return cached
    }

    if (replayOnly) {
      return new Response("Cache miss in replay-only mode", {
        status: 503
      })
    }

    const requestToStore = await beforeStoreRequest({ url, method, headers, body })
    await storeRequest(
      {
        url: requestToStore.url,
        method: requestToStore.method,
        headers: requestToStore.headers,
        body: requestToStore.body
      },
      cacheKey,
      options?.beforeStoreRequest !== undefined, // skip header filtering if hook provided
      storage,
      hashableRequest
    )

    const response = await baseFetch(input, init)

    return storeResponse(cacheKey, response, options?.beforeStoreResponse, storage, hashableRequest)
  }
}

export function enableDevFetchCache(options?: CacheOptions): void {
  if (isProduction()) {
    return
  }

  if (!isCacheEnabled()) {
    return
  }

  if (originalFetch !== null) {
    return
  }

  originalFetch = globalThis.fetch
  const cachedFetch = createCachedFetch(originalFetch, {
    ...options,
    internalFetch: options?.internalFetch ?? originalFetch
  })

  // Cast to typeof fetch to include preconnect method
  globalThis.fetch = cachedFetch as typeof globalThis.fetch

  // biome-ignore lint/suspicious/noConsole: Banner display is intentional for dev tooling
  console.info(CACHE_ENABLED_BANNER)
}

export function disableDevFetchCache(): void {
  if (originalFetch === null) {
    return
  }

  globalThis.fetch = originalFetch
  originalFetch = null
}

export function isDevFetchCacheEnabled(): boolean {
  return originalFetch !== null
}
