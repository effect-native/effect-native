import type { CachedRequest, CachedResponseMeta, CacheKey, CacheStorage, KV, KVStream, TimedChunk } from "./types"

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { jsonlToTimedChunks, timedChunksToJsonl } from "./sse-handler"

function ensureCacheDir(baseDir: string, cacheKey: string): string {
  const cacheDir = join(baseDir, cacheKey)
  if (!existsSync(cacheDir)) {
    try {
      mkdirSync(cacheDir, { recursive: true })
    } catch (error: unknown) {
      // Handle race condition where directory was created between check and mkdir
      if (!(error instanceof Error && (error as NodeJS.ErrnoException).code === "EEXIST")) {
        throw error
      }
    }
  }
  return cacheDir
}

/** Create a KV store backed by JSON files */
export function createJsonFileKV<T>(baseDir: string, filename: string): KV<CacheKey, T> {
  return {
    async get([key]): Promise<T | null> {
      const filePath = join(baseDir, key, filename)
      if (!existsSync(filePath)) {
        return null
      }
      const content = readFileSync(filePath, "utf-8")
      return JSON.parse(content) as T
    },

    async set([key], value): Promise<void> {
      const cacheDir = ensureCacheDir(baseDir, key)
      const filePath = join(cacheDir, filename)
      writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8")
    },

    async has([key]): Promise<boolean> {
      const filePath = join(baseDir, key, filename)
      return existsSync(filePath)
    },
  }
}

/** Create a KV store backed by binary files */
export function createBinaryFileKV(baseDir: string, filename: string): KV<CacheKey, Uint8Array> {
  return {
    async get([key]): Promise<Uint8Array | null> {
      const filePath = join(baseDir, key, filename)
      if (!existsSync(filePath)) {
        return null
      }
      const buffer = readFileSync(filePath)
      return new Uint8Array(buffer)
    },

    async set([key], value): Promise<void> {
      const cacheDir = ensureCacheDir(baseDir, key)
      const filePath = join(cacheDir, filename)
      writeFileSync(filePath, value)
    },

    async has([key]): Promise<boolean> {
      const filePath = join(baseDir, key, filename)
      return existsSync(filePath)
    },
  }
}

/** Create a streaming KV store for SSE chunks backed by JSONL files */
export function createJsonlFileKVStream(baseDir: string, filename: string): KVStream<CacheKey, TimedChunk> {
  return {
    async *get([key]): AsyncIterable<TimedChunk> {
      const filePath = join(baseDir, key, filename)
      if (!existsSync(filePath)) {
        return
      }

      // Read entire file and parse - streaming line-by-line is complex due to JSONL format
      // Future optimization: could stream lines and parse incrementally
      const content = readFileSync(filePath, "utf-8")
      const chunks = jsonlToTimedChunks(content)
      for (const chunk of chunks) {
        yield chunk
      }
    },

    async set([key], values): Promise<void> {
      const cacheDir = ensureCacheDir(baseDir, key)
      const filePath = join(cacheDir, filename)

      // Collect all values if async iterable
      let chunks: TimedChunk[]
      if (Array.isArray(values)) {
        chunks = values
      } else {
        chunks = []
        for await (const chunk of values) {
          chunks.push(chunk)
        }
      }

      const jsonl = timedChunksToJsonl(chunks)
      writeFileSync(filePath, jsonl, "utf-8")
    },

    async has([key]): Promise<boolean> {
      const filePath = join(baseDir, key, filename)
      return existsSync(filePath)
    },
  }
}

/** Create a complete CacheStorage backed by the filesystem */
export function createFilesystemStorage(baseDir: string): CacheStorage {
  return {
    requests: createJsonFileKV<CachedRequest>(baseDir, "request.json"),
    responseMeta: createJsonFileKV<CachedResponseMeta>(baseDir, "response.meta.json"),
    responseBody: createJsonFileKV<string>(baseDir, "response.json"),
    binaryBody: createBinaryFileKV(baseDir, "response.bin"),
    sseChunks: createJsonlFileKVStream(baseDir, "response.jsonl"),
  }
}
