/**
 * Flat file storage - stores cache files in subdirectories named by the key.
 * Each key gets its own folder with standard cache filenames inside:
 *   baseDir/001/request.json
 *   baseDir/001/response.meta.json
 *   baseDir/001/response.jsonl
 *   baseDir/002/request.json
 *   ...
 *
 * This is similar to filesystem-storage but the key IS the subdirectory name
 * (no hashing), making it suitable for conversation turn folders.
 */

import type { CachedRequest, CachedResponseMeta, CacheKey, CacheStorage, KV, KVStream, TimedChunk } from "./types.js"

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { jsonlToTimedChunks, timedChunksToJsonl } from "./sse-handler.js"

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true })
    } catch (error: unknown) {
      if (!(error instanceof Error && (error as NodeJS.ErrnoException).code === "EEXIST")) {
        throw error
      }
    }
  }
}

/** Create a KV store backed by JSON files in subdirectories: baseDir/{key}/{filename} */
export function createFlatJsonFileKV<T>(baseDir: string, filename: string): KV<CacheKey, T> {
  return {
    async get([key]: CacheKey): Promise<T | null> {
      const filePath = join(baseDir, key, filename)
      if (!existsSync(filePath)) {
        return null
      }
      const content = readFileSync(filePath, "utf-8")
      return JSON.parse(content) as T
    },

    async set([key]: CacheKey, value: T): Promise<void> {
      const dir = join(baseDir, key)
      ensureDir(dir)
      const filePath = join(dir, filename)
      writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8")
    },

    async has([key]: CacheKey): Promise<boolean> {
      const filePath = join(baseDir, key, filename)
      return existsSync(filePath)
    }
  }
}

/** Create a KV store backed by plain text files in subdirectories (no JSON serialization) */
export function createFlatTextFileKV(baseDir: string, filename: string): KV<CacheKey, string> {
  return {
    async get([key]: CacheKey): Promise<string | null> {
      const filePath = join(baseDir, key, filename)
      if (!existsSync(filePath)) {
        return null
      }
      return readFileSync(filePath, "utf-8")
    },

    async set([key]: CacheKey, value: string): Promise<void> {
      const dir = join(baseDir, key)
      ensureDir(dir)
      const filePath = join(dir, filename)
      writeFileSync(filePath, value, "utf-8")
    },

    async has([key]: CacheKey): Promise<boolean> {
      const filePath = join(baseDir, key, filename)
      return existsSync(filePath)
    }
  }
}

/** Create a KV store backed by binary files in subdirectories */
export function createFlatBinaryFileKV(baseDir: string, filename: string): KV<CacheKey, Uint8Array> {
  return {
    async get([key]: CacheKey): Promise<Uint8Array | null> {
      const filePath = join(baseDir, key, filename)
      if (!existsSync(filePath)) {
        return null
      }
      const buffer = readFileSync(filePath)
      return new Uint8Array(buffer)
    },

    async set([key]: CacheKey, value: Uint8Array): Promise<void> {
      const dir = join(baseDir, key)
      ensureDir(dir)
      const filePath = join(dir, filename)
      writeFileSync(filePath, value)
    },

    async has([key]: CacheKey): Promise<boolean> {
      const filePath = join(baseDir, key, filename)
      return existsSync(filePath)
    }
  }
}

/** Create a streaming KV store for SSE chunks in subdirectories */
export function createFlatJsonlFileKVStream(baseDir: string, filename: string): KVStream<CacheKey, TimedChunk> {
  return {
    async *get([key]: CacheKey): AsyncIterable<TimedChunk> {
      const filePath = join(baseDir, key, filename)
      if (!existsSync(filePath)) {
        return
      }

      const content = readFileSync(filePath, "utf-8")
      const chunks = jsonlToTimedChunks(content)
      for (const chunk of chunks) {
        yield chunk
      }
    },

    async set([key]: CacheKey, values: Array<TimedChunk> | AsyncIterable<TimedChunk>): Promise<void> {
      const dir = join(baseDir, key)
      ensureDir(dir)
      const filePath = join(dir, filename)

      let chunks: Array<TimedChunk>
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

    async has([key]: CacheKey): Promise<boolean> {
      const filePath = join(baseDir, key, filename)
      return existsSync(filePath)
    }
  }
}

/**
 * Create a CacheStorage that stores files in subdirectories named by the key.
 *
 * @example
 * const storage = createFlatFileStorage("/path/to/conversation")
 * // With transformCacheKey returning "001", files will be:
 * //   /path/to/conversation/001/request.json
 * //   /path/to/conversation/001/response.meta.json
 * //   /path/to/conversation/001/response.jsonl
 */
export function createFlatFileStorage(baseDir: string): CacheStorage {
  return {
    requests: createFlatJsonFileKV<CachedRequest>(baseDir, "request.json"),
    responseMeta: createFlatJsonFileKV<CachedResponseMeta>(baseDir, "response.meta.json"),
    // Use text storage for responseBody to preserve raw JSON without double-escaping
    responseBody: createFlatTextFileKV(baseDir, "response.json"),
    binaryBody: createFlatBinaryFileKV(baseDir, "response.bin"),
    sseChunks: createFlatJsonlFileKVStream(baseDir, "response.jsonl")
  }
}
