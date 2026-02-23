import type {
  CachedRequest,
  CachedRequestBody,
  CachedResponseMeta,
  CacheKey,
  CacheStorage,
  GeneratorTransformHook,
  HashableRequest,
  RawCachedRequest,
  StorableResponse,
  TimedChunk,
  TransformHook
} from "./types.js"

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  extractDataUrls,
  isBinaryContentType,
  readBinaryFile,
  restoreDataUrls,
  writeBinaryFile
} from "./binary-extractor.js"
import { getCacheDir } from "./environment.js"
import { getStorableHeaders, hashRequest, headersToRecord } from "./request-hasher.js"
import {
  isSSEResponse,
  jsonlToTimedChunks,
  recordStreamWithTiming,
  replayStreamFromAsyncIterable,
  replayStreamWithTiming,
  timedChunksToJsonl
} from "./sse-handler.js"

const DEV_FS_LOGS_PORT = 1090

// Internal fetch function, set via setInternalFetchForCache
let _internalFetch: typeof globalThis.fetch = globalThis.fetch

/** @internal Set the fetch function used for dev-fs-logs communication. */
export function setInternalFetchForCache(fetchFn: typeof globalThis.fetch): void {
  _internalFetch = fetchFn
}

async function tryDevFsLogsWrite(cacheId: string, data: unknown): Promise<boolean> {
  return _internalFetch(`http://localhost:${DEV_FS_LOGS_PORT}/cache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      cacheId,
      data
    })
  })
    .then((response) => response.ok)
    .catch(() => false)
}

async function tryDevFsLogsRead(cacheId: string): Promise<unknown | null> {
  return _internalFetch(`http://localhost:${DEV_FS_LOGS_PORT}/cache/${cacheId}`)
    .then((response) => {
      if (!response.ok) {
        return null
      }
      return response.json()
    })
    .catch(() => null)
}

function ensureCacheDir(cacheKey: string): string {
  const baseDir = getCacheDir()
  const cacheDir = join(baseDir, cacheKey)
  if (!existsSync(cacheDir)) {
    try {
      mkdirSync(cacheDir, {
        recursive: true
      })
    } catch (error: unknown) {
      // Handle potential race condition where the directory was created
      // between the existsSync check and mkdirSync call.
      if (!(error instanceof Error && (error as NodeJS.ErrnoException).code === "EEXIST")) {
        throw error
      }
    }
  }
  return cacheDir
}

function writeJsonFile(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
}

function readJsonFile<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null
  }
  const content = readFileSync(filePath, "utf-8")
  return JSON.parse(content) as T
}

function writeTextFile(filePath: string, content: string): void {
  writeFileSync(filePath, content, "utf-8")
}

function readTextFile(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null
  }
  return readFileSync(filePath, "utf-8")
}

/** Convert an array to an async iterable for generator hooks */
async function* arrayToAsyncIterable<T>(arr: Array<T>): AsyncIterable<T> {
  for (const item of arr) {
    yield item
  }
}

function parseRequestBody(body: string | undefined): CachedRequestBody | undefined {
  if (body === undefined) {
    return undefined
  }
  try {
    const parsed = JSON.parse(body)
    return { json: parsed }
  } catch {
    return { text: body }
  }
}

export async function storeRequest(
  params: RawCachedRequest,
  providedCacheKey?: string,
  skipHeaderFiltering?: boolean,
  storage?: CacheStorage,
  hashableRequest?: HashableRequest
): Promise<string> {
  const { body, headers, method, url } = params
  const cacheKey = providedCacheKey ?? hashRequest({
    url,
    method,
    headers,
    body
  })

  const request: CachedRequest = {
    url,
    method,
    headers: skipHeaderFiltering ? headers : getStorableHeaders(headers),
    body: parseRequestBody(body)
  }

  if (storage) {
    const key: CacheKey = hashableRequest ? [cacheKey, hashableRequest] : [cacheKey]
    await storage.requests.set(key, request)
  } else {
    // Legacy filesystem path
    const cacheDir = ensureCacheDir(cacheKey)
    const requestPath = join(cacheDir, "request.json")
    writeJsonFile(requestPath, request)
  }

  await tryDevFsLogsWrite(`${cacheKey}/request`, request)

  return cacheKey
}

export async function storeResponse(
  cacheKey: string,
  response: Response,
  beforeStoreResponse?: TransformHook<StorableResponse>,
  storage?: CacheStorage,
  hashableRequest?: HashableRequest
): Promise<Response> {
  const key: CacheKey = hashableRequest ? [cacheKey, hashableRequest] : [cacheKey]
  const startTime = Date.now()
  const headers = headersToRecord(response.headers)
  const contentType = headers["content-type"] ?? ""
  const isSSE = isSSEResponse(response.headers)
  const isBinary = isBinaryContentType(contentType)

  const meta: CachedResponseMeta = {
    status: response.status,
    statusText: response.statusText,
    headers,
    ttfb_ms: Date.now() - startTime,
    total_ms: 0,
    is_sse: isSSE,
    is_binary: isBinary,
    cached_at: new Date().toISOString()
  }

  if (!response.body) {
    meta.total_ms = Date.now() - startTime
    if (storage) {
      await storage.responseMeta.set(key, meta)
    } else {
      const cacheDir = ensureCacheDir(cacheKey)
      const metaPath = join(cacheDir, "response.meta.json")
      writeJsonFile(metaPath, meta)
    }
    await tryDevFsLogsWrite(`${cacheKey}/meta`, meta)
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }

  if (isBinary) {
    const responseArrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(responseArrayBuffer)
    meta.total_ms = Date.now() - startTime
    const binaryMeta = {
      ...meta,
      size: data.length,
      content_type: contentType
    }
    if (storage) {
      await storage.responseMeta.set(key, binaryMeta)
      await storage.binaryBody.set(key, data)
    } else {
      const cacheDir = ensureCacheDir(cacheKey)
      const binPath = join(cacheDir, "response.bin")
      writeBinaryFile(binPath, data)
      const metaPath = join(cacheDir, "response.meta.json")
      writeJsonFile(metaPath, binaryMeta)
    }
    await tryDevFsLogsWrite(`${cacheKey}/meta`, meta)
    return new Response(responseArrayBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }

  if (isSSE) {
    const [recordStream, returnStream] = response.body.tee()
    const chunks = await recordStreamWithTiming(recordStream)
    meta.total_ms = Date.now() - startTime

    if (storage) {
      await storage.responseMeta.set(key, meta)
      await storage.sseChunks.set(key, chunks)
    } else {
      const cacheDir = ensureCacheDir(cacheKey)
      const jsonlPath = join(cacheDir, "response.jsonl")
      const assetsDir = join(cacheDir, "response.jsonl.assets")
      let jsonlContent = timedChunksToJsonl(chunks)
      const { content: extractedContent } = extractDataUrls(jsonlContent, assetsDir)
      jsonlContent = extractedContent
      writeTextFile(jsonlPath, jsonlContent)

      const metaPath = join(cacheDir, "response.meta.json")
      writeJsonFile(metaPath, meta)
    }
    await tryDevFsLogsWrite(`${cacheKey}/meta`, meta)
    await tryDevFsLogsWrite(`${cacheKey}/sse`, chunks)

    return new Response(returnStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }

  const text = await response.text()
  meta.total_ms = Date.now() - startTime

  // Apply beforeStoreResponse hook if provided
  const storableResponse: StorableResponse = { body: text, meta }
  const transformedResponse = beforeStoreResponse
    ? await beforeStoreResponse(storableResponse)
    : storableResponse

  if (storage) {
    await storage.responseMeta.set(key, transformedResponse.meta)
    await storage.responseBody.set(key, transformedResponse.body ?? "")
  } else {
    const cacheDir = ensureCacheDir(cacheKey)
    const jsonPath = join(cacheDir, "response.json")
    const assetsDir = join(cacheDir, "response.json.assets")
    const { content: extractedContent } = extractDataUrls(transformedResponse.body ?? "", assetsDir)
    writeJsonFile(jsonPath, {
      body: extractedContent,
      meta: transformedResponse.meta
    })
  }

  await tryDevFsLogsWrite(`${cacheKey}/response`, {
    body: transformedResponse.body,
    meta: transformedResponse.meta
  })

  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  })
}

export async function getCachedResponse(
  cacheKey: string,
  afterLoadResponse?: TransformHook<StorableResponse>,
  transformSSEChunk?: GeneratorTransformHook<TimedChunk>,
  storage?: CacheStorage
): Promise<Response | null> {
  const key: CacheKey = [cacheKey]

  // Try to get response metadata
  let responseMeta: CachedResponseMeta | null = null

  if (storage) {
    responseMeta = await storage.responseMeta.get(key)
  } else {
    const cacheDir = join(getCacheDir(), cacheKey)
    const metaPath = join(cacheDir, "response.meta.json")
    responseMeta = readJsonFile<CachedResponseMeta>(metaPath)

    // For non-streaming responses, metadata is stored inside response.json
    if (!responseMeta) {
      const jsonPath = join(cacheDir, "response.json")
      const cached = readJsonFile<{
        body: string
        meta: CachedResponseMeta
      }>(jsonPath)
      if (cached?.meta) {
        responseMeta = cached.meta
      }
    }
  }

  if (!responseMeta) {
    const devFsMeta = (await tryDevFsLogsRead(`${cacheKey}/meta`)) as CachedResponseMeta | null
    if (!devFsMeta) {
      return null
    }
    responseMeta = devFsMeta
  }

  const headers = new Headers(responseMeta.headers)

  // Handle binary responses
  if (responseMeta.is_binary) {
    let data: Uint8Array | null = null
    if (storage) {
      data = await storage.binaryBody.get(key)
    } else {
      const cacheDir = join(getCacheDir(), cacheKey)
      const binPath = join(cacheDir, "response.bin")
      data = readBinaryFile(binPath)
    }
    if (!data) {
      return null
    }
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    return new Response(arrayBuffer, {
      status: responseMeta.status,
      statusText: responseMeta.statusText,
      headers
    })
  }

  // Handle SSE responses
  if (responseMeta.is_sse) {
    if (storage) {
      const chunks = storage.sseChunks.get(key)
      // Check if there are any chunks by peeking
      const iterator = chunks[Symbol.asyncIterator]()
      const first = await iterator.next()
      if (first.done) {
        // No chunks in storage, try dev-fs-logs fallback
        const devFsChunks = (await tryDevFsLogsRead(`${cacheKey}/sse`)) as Array<TimedChunk> | null
        if (!devFsChunks) {
          return null
        }
        const stream = transformSSEChunk
          ? replayStreamFromAsyncIterable(transformSSEChunk(arrayToAsyncIterable(devFsChunks)))
          : replayStreamWithTiming(devFsChunks)
        return new Response(stream, {
          status: responseMeta.status,
          statusText: responseMeta.statusText,
          headers
        })
      }
      // Reconstruct the async iterable with the first chunk prepended
      async function* prependFirst(): AsyncIterable<TimedChunk> {
        yield first.value
        for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
          yield chunk
        }
      }
      const chunksIterable = prependFirst()
      const stream = transformSSEChunk
        ? replayStreamFromAsyncIterable(transformSSEChunk(chunksIterable))
        : replayStreamFromAsyncIterable(chunksIterable)
      return new Response(stream, {
        status: responseMeta.status,
        statusText: responseMeta.statusText,
        headers
      })
    }

    // Legacy filesystem path
    const cacheDir = join(getCacheDir(), cacheKey)
    const jsonlPath = join(cacheDir, "response.jsonl")
    const assetsDir = join(cacheDir, "response.jsonl.assets")
    let jsonlContent = readTextFile(jsonlPath)

    if (!jsonlContent) {
      const devFsChunks = (await tryDevFsLogsRead(`${cacheKey}/sse`)) as Array<TimedChunk> | null
      if (!devFsChunks) {
        return null
      }
      const stream = transformSSEChunk
        ? replayStreamFromAsyncIterable(transformSSEChunk(arrayToAsyncIterable(devFsChunks)))
        : replayStreamWithTiming(devFsChunks)
      return new Response(stream, {
        status: responseMeta.status,
        statusText: responseMeta.statusText,
        headers
      })
    }

    jsonlContent = restoreDataUrls(jsonlContent, assetsDir)
    const chunks = jsonlToTimedChunks(jsonlContent)
    const stream = transformSSEChunk
      ? replayStreamFromAsyncIterable(transformSSEChunk(arrayToAsyncIterable(chunks)))
      : replayStreamWithTiming(chunks)

    return new Response(stream, {
      status: responseMeta.status,
      statusText: responseMeta.statusText,
      headers
    })
  }

  // Handle text/JSON responses
  let body: string | null = null
  let cachedMeta: CachedResponseMeta | null = responseMeta

  if (storage) {
    body = await storage.responseBody.get(key)
  } else {
    const cacheDir = join(getCacheDir(), cacheKey)
    const jsonPath = join(cacheDir, "response.json")
    const assetsDir = join(cacheDir, "response.json.assets")
    const cached = readJsonFile<{
      body: string
      meta: CachedResponseMeta
    }>(jsonPath)

    if (cached) {
      body = restoreDataUrls(cached.body, assetsDir)
      cachedMeta = cached.meta
    }
  }

  if (!body) {
    const devFsResponse = (await tryDevFsLogsRead(`${cacheKey}/response`)) as {
      body: string
      meta: CachedResponseMeta
    } | null
    if (!devFsResponse) {
      return null
    }
    const transformed = afterLoadResponse
      ? await afterLoadResponse({ body: devFsResponse.body, meta: devFsResponse.meta })
      : devFsResponse
    return new Response(transformed.body, {
      status: transformed.meta.status,
      statusText: transformed.meta.statusText,
      headers: new Headers(transformed.meta.headers)
    })
  }

  // Apply afterLoadResponse hook if provided
  const storableResponse: StorableResponse = { body, meta: cachedMeta }
  const transformedResponse = afterLoadResponse
    ? await afterLoadResponse(storableResponse)
    : storableResponse

  return new Response(transformedResponse.body, {
    status: transformedResponse.meta.status,
    statusText: transformedResponse.meta.statusText,
    headers: new Headers(transformedResponse.meta.headers)
  })
}

export function getCacheKeyFromUrl(url: string): string | null {
  const cacheSchemes = ["cache://", "devcache://"]
  for (const scheme of cacheSchemes) {
    if (url.startsWith(scheme)) {
      return url.slice(scheme.length)
    }
  }
  return null
}
