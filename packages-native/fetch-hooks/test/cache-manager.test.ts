import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createCachedFetch, createFilesystemStorage } from "../src/index"
import type { CachedRequest, CachedResponseMeta, CacheKey, CacheOptions, CacheStorage, TimedChunk } from "../src/types"

/** Creates a mock fetch that tracks calls, ignoring internal localhost calls */
function createMockFetch(handler: (url: string) => Response | Promise<Response>) {
  let callCount = 0
  const mockFetch = async (input: Request | string | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (!url.includes("localhost")) {
      callCount++
      return handler(url)
    }
    // Return empty response for localhost (dev-fs-logs) calls
    return new Response(null, { status: 200 })
  }
  return {
    fetch: mockFetch as unknown as typeof fetch,
    getCallCount: () => callCount
  }
}

/** Find cached request.json in a cache directory */
function findCachedRequest(cacheDir: string): CachedRequest | null {
  const entries = existsSync(cacheDir) ? readdirSync(cacheDir) : []
  for (const entry of entries) {
    const requestPath = join(cacheDir, entry, "request.json")
    if (existsSync(requestPath)) {
      return JSON.parse(readFileSync(requestPath, "utf-8"))
    }
  }
  return null
}

/** Find cached response in a cache directory (handles both old and new storage formats) */
function findCachedResponse(cacheDir: string): { body: string; meta: unknown } | null {
  const entries = existsSync(cacheDir) ? readdirSync(cacheDir) : []
  for (const entry of entries) {
    const responsePath = join(cacheDir, entry, "response.json")
    const metaPath = join(cacheDir, entry, "response.meta.json")
    if (existsSync(responsePath)) {
      const rawContent = readFileSync(responsePath, "utf-8")
      // New format: response.json contains raw text body, meta is separate
      if (existsSync(metaPath)) {
        const meta = JSON.parse(readFileSync(metaPath, "utf-8"))
        return { body: rawContent, meta }
      }
      // Old format: response.json contains {body, meta} as JSON
      try {
        const bodyContent = JSON.parse(rawContent)
        if (bodyContent && typeof bodyContent.body === "string") {
          return bodyContent
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  }
  return null
}

function createTestCacheDir(prefix: string): string {
  const cacheDir = join(process.cwd(), ".cache", `${prefix}-${randomUUID()}`)
  mkdirSync(cacheDir, { recursive: true })
  return cacheDir
}

function createCachedFetchWithFilesystemStorage(
  baseFetch: typeof globalThis.fetch,
  cacheDir: string,
  options?: CacheOptions
) {
  return createCachedFetch(baseFetch, {
    ...options,
    storage: createFilesystemStorage(cacheDir)
  })
}

/**
 * Integration test for SSE stream caching.
 *
 * This test reproduces a real issue where OpenRouter SDK streams
 * would fail with "Stream ended without completion event" when replayed
 * from cache. The root cause was that the final events in the SSE stream
 * were not being captured during recording.
 */
describe.sequential("SSE stream caching - full integration", () => {
  let testCacheDir = ""

  beforeEach(() => {
    testCacheDir = createTestCacheDir("fetch-test")
  })

  afterEach(() => {
    if (testCacheDir && existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true })
    }
  })

  /**
   * Simulates an OpenRouter-style SSE response stream.
   * The key events are:
   * - response.created
   * - response.output_item.added
   * - response.output_text.delta (multiple)
   * - response.output_text.done
   * - response.output_item.done
   * - response.completed  <-- THIS IS THE CRITICAL EVENT
   */
  function createOpenRouterStyleSSEStream(): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    const events = [
      { type: "response.created", response: { id: "test-123", status: "in_progress" } },
      { type: "response.output_item.added", output_index: 0, item: { type: "message", id: "msg-1" } },
      { type: "response.output_text.delta", delta: "Hello" },
      { type: "response.output_text.delta", delta: " world" },
      { type: "response.output_text.done", text: "Hello world" },
      { type: "response.output_item.done", item: { type: "message", id: "msg-1", content: [{ text: "Hello world" }] } },
      { type: "response.completed", response: { id: "test-123", status: "completed", output: [] } }
    ]

    let index = 0
    return new ReadableStream({
      async pull(controller) {
        if (index >= events.length) {
          controller.close()
          return
        }
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 5))
        const event = events[index]!
        const sseData = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(sseData))
        index++
      }
    })
  }

  it("returns the SSE response immediately without waiting for full recording", async () => {
    const encoder = new TextEncoder()
    const events = [
      { type: "start" },
      { type: "delta", value: "a" },
      { type: "delta", value: "b" },
      { type: "end" }
    ]

    const mock = createMockFetch((): Response => {
      let index = 0
      const stream = new ReadableStream({
        async pull(controller) {
          if (index >= events.length) {
            controller.close()
            return
          }

          await new Promise((resolve) => setTimeout(resolve, 120))
          const event = events[index]!
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          index++
        }
      })

      return new Response(stream, {
        status: 200,
        statusText: "OK",
        headers: {
          "content-type": "text/event-stream"
        }
      })
    })

    const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir)

    const start = Date.now()
    const response = await cachedFetch("https://api.example.com/stream-latency", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "latency" })
    })
    const elapsed = Date.now() - start

    // If storeResponse awaits full recording, this is ~480ms.
    // Expected behavior is immediate return so caller can start reading stream.
    expect(elapsed).toBeLessThan(200)

    const eventsRead = await collectSSEEvents(response)
    expect(eventsRead.map((e) => e.type)).toEqual(["start", "delta", "delta", "end"])
  })

  it("preserves ALL SSE events including response.completed when caching and replaying", async () => {
    const mockFetch = async (_input: Request | string | URL): Promise<Response> => {
      const stream = createOpenRouterStyleSSEStream()
      return new Response(stream, {
        status: 200,
        statusText: "OK",
        headers: {
          "content-type": "text/event-stream"
        }
      })
    }

    const cachedFetch = createCachedFetchWithFilesystemStorage(mockFetch as typeof fetch, testCacheDir)

    // First call - should hit the mock and cache
    const response1 = await cachedFetch("https://api.example.com/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "test" })
    })

    // Consume the first response fully
    const events1 = await collectSSEEvents(response1)

    // Verify all events were received on first call
    expect(events1.map((e) => e.type)).toEqual([
      "response.created",
      "response.output_item.added",
      "response.output_text.delta",
      "response.output_text.delta",
      "response.output_text.done",
      "response.output_item.done",
      "response.completed"
    ])

    // Second call - should hit cache
    const response2 = await cachedFetch("https://api.example.com/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "test" })
    })

    // Consume the cached response fully
    const events2 = await collectSSEEvents(response2)

    // THIS IS THE CRITICAL ASSERTION:
    // The cached response must include ALL events, especially response.completed
    expect(events2.map((e) => e.type)).toEqual([
      "response.created",
      "response.output_item.added",
      "response.output_text.delta",
      "response.output_text.delta",
      "response.output_text.done",
      "response.output_item.done",
      "response.completed"
    ])

    // Verify the response.completed event has the correct structure
    const completedEvent = events2.find((e) => e.type === "response.completed") as
      | { type: string; response?: { status?: string } }
      | undefined
    expect(completedEvent).toBeDefined()
    expect(completedEvent?.response?.status).toBe("completed")
  })

  it("handles streams where consumer reads faster than producer writes", async () => {
    // This tests the race condition scenario
    const encoder = new TextEncoder()
    const events = [
      { type: "start" },
      { type: "data", value: 1 },
      { type: "data", value: 2 },
      { type: "end" }
    ]

    const mockFetch = async (_input: Request | string | URL, _init?: RequestInit): Promise<Response> => {
      let index = 0
      const stream = new ReadableStream({
        async pull(controller) {
          if (index >= events.length) {
            controller.close()
            return
          }
          // Variable delays to simulate real network conditions
          await new Promise((resolve) => setTimeout(resolve, index * 10))
          const event = events[index]!
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          index++
        }
      })
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" }
      })
    }

    const cachedFetch = createCachedFetchWithFilesystemStorage(mockFetch as unknown as typeof fetch, testCacheDir)

    // First call
    const response1 = await cachedFetch("https://api.example.com/race-test")
    const events1 = await collectSSEEvents(response1)
    expect(events1).toHaveLength(4)
    expect(events1[3]?.type).toBe("end")

    // Replay from cache
    const response2 = await cachedFetch("https://api.example.com/race-test")
    const events2 = await collectSSEEvents(response2)
    expect(events2).toHaveLength(4)
    expect(events2[3]?.type).toBe("end")
  })
})

describe.sequential("Request body caching format", () => {
  let testCacheDir = ""

  beforeEach(() => {
    testCacheDir = createTestCacheDir("fetch-test-body")
  })

  afterEach(() => {
    if (testCacheDir && existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true })
    }
  })

  function findCachedRequest(): CachedRequest | null {
    const entries = existsSync(testCacheDir)
      ? readdirSync(testCacheDir)
      : []
    for (const entry of entries) {
      const requestPath = join(testCacheDir, entry, "request.json")
      if (existsSync(requestPath)) {
        return JSON.parse(readFileSync(requestPath, "utf-8"))
      }
    }
    return null
  }

  it("stores JSON body as parsed object with { json: ... } wrapper", async () => {
    const mockFetch = async () => new Response("ok", { status: 200 })
    const cachedFetch = createCachedFetchWithFilesystemStorage(mockFetch as unknown as typeof fetch, testCacheDir)

    await cachedFetch("https://api.example.com/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello", count: 42 })
    })

    const cached = findCachedRequest()
    expect(cached).not.toBeNull()
    expect(cached!.body).toEqual({ json: { message: "hello", count: 42 } })
  })

  it("stores non-JSON body as text with { text: ... } wrapper", async () => {
    const mockFetch = async () => new Response("ok", { status: 200 })
    const cachedFetch = createCachedFetchWithFilesystemStorage(mockFetch as unknown as typeof fetch, testCacheDir)

    await cachedFetch("https://api.example.com/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "plain text body"
    })

    const cached = findCachedRequest()
    expect(cached).not.toBeNull()
    expect(cached!.body).toEqual({ text: "plain text body" })
  })

  it("stores Request object body as parsed JSON", async () => {
    const mockFetch = async () => new Response("ok", { status: 200 })
    const cachedFetch = createCachedFetchWithFilesystemStorage(mockFetch as unknown as typeof fetch, testCacheDir)

    const request = new Request("https://api.example.com/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromRequest: true })
    })

    await cachedFetch(request)

    const cached = findCachedRequest()
    expect(cached).not.toBeNull()
    expect(cached!.body).toEqual({ json: { fromRequest: true } })
  })

  it("handles undefined body gracefully", async () => {
    const mockFetch = async () => new Response("ok", { status: 200 })
    const cachedFetch = createCachedFetchWithFilesystemStorage(mockFetch as unknown as typeof fetch, testCacheDir)

    await cachedFetch("https://api.example.com/test", {
      method: "GET"
    })

    const cached = findCachedRequest()
    expect(cached).not.toBeNull()
    expect(cached!.body).toBeUndefined()
  })
})

describe.sequential("Lifecycle hooks", () => {
  let testCacheDir = ""

  beforeEach(() => {
    testCacheDir = createTestCacheDir("fetch-test-hooks")
  })

  afterEach(() => {
    if (testCacheDir && existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true })
    }
  })

  describe("beforeHash", () => {
    it("transforms request data before hashing (affects cache key)", async () => {
      const mock = createMockFetch((_url) => new Response("response-1", { status: 200 }))

      let hookCallCount = 0
      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir, {
        // Strip timestamp from URL before hashing - different timestamps hit same cache
        beforeHash: async (req) => {
          hookCallCount++
          return { ...req, url: req.url.replace(/\?ts=\d+/, "") }
        }
      })

      const response1 = await cachedFetch("https://api.example.com/data?ts=123", { method: "GET" })
      expect(await response1.text()).toBe("response-1")

      const response2 = await cachedFetch("https://api.example.com/data?ts=456", { method: "GET" })
      expect(await response2.text()).toBe("response-1") // Same response from cache

      expect(hookCallCount).toBe(2) // Hook called for each request
      expect(mock.getCallCount()).toBe(1) // But only one network call
    })

    it("defaults to identity function when not provided", async () => {
      const mock = createMockFetch((_url) => new Response("ok", { status: 200 }))
      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir)

      await cachedFetch("https://api.example.com/uniqueA", { method: "GET" })
      await cachedFetch("https://api.example.com/uniqueB", { method: "GET" })

      expect(mock.getCallCount()).toBe(2) // Both requests hit network (different cache keys)
    })
  })

  describe("beforeStoreRequest", () => {
    it("transforms request data before storing to disk", async () => {
      const mock = createMockFetch((_url) => new Response("ok", { status: 200 }))

      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir, {
        // Redact authorization header before storing
        beforeStoreRequest: async (req) => ({
          ...req,
          headers: { ...req.headers, authorization: "[REDACTED]" }
        })
      })

      await cachedFetch("https://api.example.com/secret", {
        method: "POST",
        headers: { authorization: "Bearer secret-token-123", "content-type": "application/json" },
        body: JSON.stringify({ data: "test" })
      })

      // Find and read the cached request
      const cached = findCachedRequest(testCacheDir)
      expect(cached).not.toBeNull()
      expect(cached!.headers.authorization).toBe("[REDACTED]")
      expect(cached!.headers["content-type"]).toBe("application/json")
    })
  })

  describe("beforeStoreResponse", () => {
    it("transforms response body before storing to disk", async () => {
      const mock = createMockFetch((_url) =>
        new Response(
          JSON.stringify({ secret: "password123", data: "public" }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )

      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir, {
        // Redact secrets from response body before storing
        beforeStoreResponse: async (res) => ({
          ...res,
          body: res.body?.replace(/"secret":"[^"]*"/, "\"secret\":\"[REDACTED]\"")
        })
      })

      // First call - stores to cache
      const response = await cachedFetch("https://api.example.com/data")
      await response.text() // consume to ensure storage completes

      // Find and read the cached response
      const cached = findCachedResponse(testCacheDir)
      expect(cached).not.toBeNull()
      expect(cached!.body).toContain("\"secret\":\"[REDACTED]\"")
      expect(cached!.body).toContain("\"data\":\"public\"")
    })
  })

  describe("afterLoadResponse", () => {
    it("transforms response body after loading from cache", async () => {
      const mock = createMockFetch((_url) =>
        new Response(
          JSON.stringify({ timestamp: "2024-01-01", data: "cached" }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )

      let hookCallCount = 0
      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir, {
        // Inject current timestamp when replaying from cache
        afterLoadResponse: async (res) => {
          hookCallCount++
          return {
            ...res,
            body: res.body?.replace(/"timestamp":"[^"]*"/, "\"timestamp\":\"INJECTED\"")
          }
        }
      })

      // First call - stores to cache (hook should NOT be called)
      const response1 = await cachedFetch("https://api.example.com/timestamped")
      const text1 = await response1.text()
      expect(text1).toContain("\"timestamp\":\"2024-01-01\"") // Original value
      expect(hookCallCount).toBe(0) // Hook not called on fresh fetch

      // Second call - loads from cache (hook SHOULD be called)
      const response2 = await cachedFetch("https://api.example.com/timestamped")
      const text2 = await response2.text()
      expect(text2).toContain("\"timestamp\":\"INJECTED\"") // Transformed value
      expect(hookCallCount).toBe(1) // Hook called on cache hit
    })
  })

  describe("transformCacheKey", () => {
    it("transforms the cache key after hashing with access to request", async () => {
      const mock = createMockFetch((_url) => new Response("ok", { status: 200 }))

      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir, {
        // Add model name prefix extracted from request body
        transformCacheKey: (cacheKey, request) => {
          try {
            const body = request.body ? JSON.parse(request.body) : {}
            const model = body.model ?? "unknown"
            return `${model}_${cacheKey}`
          } catch {
            return cacheKey
          }
        }
      })

      await cachedFetch("https://api.example.com/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4", messages: [] })
      })

      // Find the cache entry directory - should have model prefix
      const entries = readdirSync(testCacheDir) as Array<string>
      expect(entries.length).toBe(1)
      expect(entries[0]).toMatch(/^gpt-4_[0-9A-Za-z]+$/)
    })

    it("receives both cacheKey and full request for custom logic", async () => {
      const mock = createMockFetch((_url) => new Response("ok", { status: 200 }))

      let receivedCacheKey: string | undefined
      let receivedRequest: unknown | undefined

      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir, {
        transformCacheKey: (cacheKey, request) => {
          receivedCacheKey = cacheKey
          receivedRequest = request
          return cacheKey
        }
      })

      await cachedFetch("https://api.example.com/test", {
        method: "POST",
        headers: { "x-custom": "value" },
        body: "test body"
      })

      expect(receivedCacheKey).toBeDefined()
      expect(receivedCacheKey!.length).toBeLessThanOrEqual(12) // Short base62 hash
      expect(receivedRequest).toMatchObject({
        url: "https://api.example.com/test",
        method: "POST",
        body: "test body"
      })
    })

    it("defaults to identity when not provided", async () => {
      const mock = createMockFetch((_url) => new Response("ok", { status: 200 }))
      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir)

      await cachedFetch("https://api.example.com/simple", { method: "GET" })

      // Cache entry should just be the hash (no prefix)
      const entries = readdirSync(testCacheDir) as Array<string>
      expect(entries.length).toBe(1)
      expect(entries[0]).toMatch(/^[0-9A-Za-z]+$/) // Just base62 chars
    })
  })

  describe("transformSSEChunk (generator hook)", () => {
    it("transforms SSE chunks during replay using async generator", async () => {
      const encoder = new TextEncoder()
      const events = [
        { type: "start", secret: "abc123" },
        { type: "data", secret: "def456" },
        { type: "end", secret: "ghi789" }
      ]

      const mock = createMockFetch((_url) => {
        let index = 0
        const stream = new ReadableStream({
          async pull(controller) {
            if (index >= events.length) {
              controller.close()
              return
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(events[index])}\n\n`))
            index++
          }
        })
        return new Response(stream, {
          status: 200,
          headers: { "content-type": "text/event-stream" }
        })
      })

      const transformedSecrets: Array<string> = []
      const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir, {
        // Transform SSE chunks during replay - redact secrets
        async *transformSSEChunk(chunks) {
          for await (const chunk of chunks) {
            transformedSecrets.push(chunk.data)
            yield {
              ...chunk,
              data: chunk.data.replace(/"secret":"[^"]*"/g, "\"secret\":\"[REDACTED]\"")
            }
          }
        }
      })

      // First call - stores to cache
      const response1 = await cachedFetch("https://api.example.com/stream")
      await collectSSEEvents(response1)

      // Second call - replays from cache with transformation
      const response2 = await cachedFetch("https://api.example.com/stream")
      const events2 = await collectSSEEvents(response2)

      // All events should have redacted secrets
      expect(events2.every((e) => e.secret === "[REDACTED]")).toBe(true)
      expect(events2).toHaveLength(3)
    })
  })
})

describe("Custom CacheStorage", () => {
  /** Create an in-memory storage implementation for testing */
  function createInMemoryStorage(): CacheStorage & { data: Map<string, unknown> } {
    const data = new Map<string, unknown>()

    const createKV = <T>() => ({
      async get([key]: CacheKey): Promise<T | null> {
        return (data.get(key) as T) ?? null
      },
      async set([key]: CacheKey, value: T): Promise<void> {
        data.set(key, value)
      },
      async has([key]: CacheKey): Promise<boolean> {
        return data.has(key)
      }
    })

    const createKVStream = () => ({
      async *get([key]: CacheKey): AsyncIterable<TimedChunk> {
        const chunks = data.get(`sse:${key}`) as Array<TimedChunk> | undefined
        if (chunks) {
          for (const chunk of chunks) {
            yield chunk
          }
        }
      },
      async set([key]: CacheKey, values: Array<TimedChunk> | AsyncIterable<TimedChunk>): Promise<void> {
        let chunks: Array<TimedChunk>
        if (Array.isArray(values)) {
          chunks = values.slice()
        } else {
          chunks = []
          for await (const chunk of values) {
            chunks.push(chunk)
          }
        }
        data.set(`sse:${key}`, chunks)
      },
      async has([key]: CacheKey): Promise<boolean> {
        return data.has(`sse:${key}`)
      }
    })

    return {
      data,
      requests: createKV<CachedRequest>(),
      responseMeta: createKV<CachedResponseMeta>(),
      responseBody: createKV<string>(),
      binaryBody: createKV<Uint8Array>(),
      sseChunks: createKVStream()
    }
  }

  it("uses custom storage instead of filesystem", async () => {
    const storage = createInMemoryStorage()
    const mock = createMockFetch((_url) =>
      new Response(
        JSON.stringify({ message: "hello" }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const cachedFetch = createCachedFetch(mock.fetch, { storage })

    // First call - stores to in-memory storage
    const response1 = await cachedFetch("https://api.example.com/data")
    const text1 = await response1.text()
    expect(text1).toBe("{\"message\":\"hello\"}")
    expect(mock.getCallCount()).toBe(1)

    // Verify data is in memory, not on disk
    expect(storage.data.size).toBeGreaterThan(0)

    // Second call - retrieves from in-memory storage
    const response2 = await cachedFetch("https://api.example.com/data")
    const text2 = await response2.text()
    expect(text2).toBe("{\"message\":\"hello\"}")
    expect(mock.getCallCount()).toBe(1) // No additional fetch
  })

  it("custom storage receives HashableRequest context on set", async () => {
    const storage = createInMemoryStorage()
    const capturedRequests: Array<{ key: string; request?: unknown }> = []

    // Wrap the storage to capture requests
    const wrappedStorage: CacheStorage = {
      ...storage,
      requests: {
        ...storage.requests,
        async set(cacheKey: CacheKey, value) {
          const [key, request] = cacheKey
          capturedRequests.push({ key, request })
          return storage.requests.set(cacheKey, value)
        }
      }
    }

    const mock = createMockFetch((_url) => new Response("ok", { status: 200 }))
    const cachedFetch = createCachedFetch(mock.fetch, { storage: wrappedStorage })

    await cachedFetch("https://api.example.com/test", {
      method: "POST",
      body: JSON.stringify({ query: "test" })
    })

    expect(capturedRequests.length).toBe(1)
    expect(capturedRequests[0]?.request).toMatchObject({
      url: "https://api.example.com/test",
      method: "POST"
    })
  })
})

/**
 * Helper to collect all SSE events from a response stream
 */
async function collectSSEEvents(response: Response): Promise<Array<{ type: string; [key: string]: unknown }>> {
  const events: Array<{ type: string; [key: string]: unknown }> = []
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events from buffer
    const lines = buffer.split("\n")
    buffer = lines.pop() || "" // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6)
        if (jsonStr.trim()) {
          events.push(JSON.parse(jsonStr))
        }
      }
    }
  }

  // Process any remaining data in buffer
  if (buffer.startsWith("data: ")) {
    const jsonStr = buffer.slice(6)
    if (jsonStr.trim()) {
      events.push(JSON.parse(jsonStr))
    }
  }

  return events
}

describe.sequential("Binary extraction in request.json", () => {
  let testCacheDir = ""

  beforeEach(() => {
    testCacheDir = createTestCacheDir("fetch-test-binary-request")
  })

  afterEach(() => {
    if (testCacheDir && existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true })
    }
  })

  it("extracts inline base64 data URLs from request body to sidecar files", async () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const mockFetch = async () => new Response("ok", { status: 200 })
    const cachedFetch = createCachedFetchWithFilesystemStorage(mockFetch as unknown as typeof fetch, testCacheDir)

    await cachedFetch("https://api.example.com/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image: `data:image/png;base64,${pngBase64}`
      })
    })

    // Find the cache entry
    const entries = readdirSync(testCacheDir)
    expect(entries.length).toBeGreaterThan(0)
    const cacheEntry = entries[0]
    const requestPath = join(testCacheDir, cacheEntry, "request.json")
    const assetsDir = join(testCacheDir, cacheEntry, "request.json.assets")

    // Verify request.json contains sidecar reference, not raw base64
    const rawRequestJson = readFileSync(requestPath, "utf-8")
    expect(rawRequestJson).toContain("__sidecar:0001.png__")
    expect(rawRequestJson).not.toContain(pngBase64)

    // Verify sidecar file was created
    expect(existsSync(assetsDir)).toBe(true)
    const sidecarFile = join(assetsDir, "0001.png")
    expect(existsSync(sidecarFile)).toBe(true)

    // Verify sidecar file contains the decoded binary
    const sidecarContent = readFileSync(sidecarFile)
    const expectedContent = Buffer.from(pngBase64, "base64")
    expect(sidecarContent).toEqual(expectedContent)
  })

  it("extracts inline base64 data URLs from response body to sidecar files", async () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const mock = createMockFetch((_url) =>
      new Response(
        JSON.stringify({ image: `data:image/png;base64,${pngBase64}` }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )
    const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir)

    const response = await cachedFetch("https://api.example.com/image")
    await response.text() // consume to trigger storage

    // Find the cache entry
    const entries = readdirSync(testCacheDir)
    expect(entries.length).toBeGreaterThan(0)
    const cacheEntry = entries[0]
    const responsePath = join(testCacheDir, cacheEntry, "response.json")
    const assetsDir = join(testCacheDir, cacheEntry, "response.json.assets")

    // Verify response.json contains sidecar reference, not raw base64
    const rawResponseJson = readFileSync(responsePath, "utf-8")
    expect(rawResponseJson).toContain("__sidecar:0001.png__")
    expect(rawResponseJson).not.toContain(pngBase64)

    // Verify sidecar file was created
    expect(existsSync(assetsDir)).toBe(true)
    const sidecarFile = join(assetsDir, "0001.png")
    expect(existsSync(sidecarFile)).toBe(true)
  })

  it("restores data URLs when reading cached request", async () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const originalBody = { image: `data:image/png;base64,${pngBase64}` }
    const mockFetch = async () => new Response("ok", { status: 200 })
    const cachedFetch = createCachedFetchWithFilesystemStorage(mockFetch as unknown as typeof fetch, testCacheDir)

    // Store request with base64 data URL
    await cachedFetch("https://api.example.com/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(originalBody)
    })

    // Use the storage abstraction to read back - it should restore the data URL
    const { createFilesystemStorage } = await import("../src/filesystem-storage")
    const storage = createFilesystemStorage(testCacheDir)

    const entries = readdirSync(testCacheDir)
    const cacheKey = entries[0]
    const cached = await storage.requests.get([cacheKey])

    expect(cached).not.toBeNull()
    // The restored body.json should have the original data URL
    expect(cached!.body).toEqual({ json: originalBody })
  })

  it("restores data URLs when reading cached response body", async () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const originalBody = JSON.stringify({ image: `data:image/png;base64,${pngBase64}` })
    const mock = createMockFetch((_url) =>
      new Response(originalBody, { status: 200, headers: { "content-type": "application/json" } })
    )
    const cachedFetch = createCachedFetchWithFilesystemStorage(mock.fetch, testCacheDir)

    // Store response with base64 data URL
    const response = await cachedFetch("https://api.example.com/image-restore")
    await response.text() // consume to trigger storage

    // Use the storage abstraction to read back - it should restore the data URL
    const { createFilesystemStorage } = await import("../src/filesystem-storage")
    const storage = createFilesystemStorage(testCacheDir)

    const entries = readdirSync(testCacheDir)
    const cacheKey = entries[0]
    const cachedBody = await storage.responseBody.get([cacheKey])

    expect(cachedBody).not.toBeNull()
    // The restored response body should have the original data URL
    expect(cachedBody).toEqual(originalBody)
  })
})
