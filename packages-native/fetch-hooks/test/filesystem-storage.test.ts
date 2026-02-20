import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { createBinaryFileKV, createJsonFileKV, createJsonlFileKVStream } from "../src/filesystem-storage"
import type { TimedChunk } from "../src/types"

const TEST_DIR = join(process.cwd(), "packages-native/fetch-hooks/.test-cache-kv")

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
})

describe("createJsonFileKV", () => {
  it("get returns null for missing key", async () => {
    const kv = createJsonFileKV<{ name: string }>(TEST_DIR, "data.json")
    const result = await kv.get(["nonexistent"])
    expect(result).toBeNull()
  })

  it("set then get returns value", async () => {
    const kv = createJsonFileKV<{ name: string }>(TEST_DIR, "data.json")
    await kv.set(["mykey"], { name: "test" })
    const result = await kv.get(["mykey"])
    expect(result).toEqual({ name: "test" })
  })

  it("has returns false for missing key", async () => {
    const kv = createJsonFileKV<{ name: string }>(TEST_DIR, "data.json")
    const result = await kv.has(["nonexistent"])
    expect(result).toBe(false)
  })

  it("has returns true after set", async () => {
    const kv = createJsonFileKV<{ name: string }>(TEST_DIR, "data.json")
    await kv.set(["mykey"], { name: "test" })
    const result = await kv.has(["mykey"])
    expect(result).toBe(true)
  })

  it("ignores request context in key tuple", async () => {
    const kv = createJsonFileKV<{ name: string }>(TEST_DIR, "data.json")
    const request = { url: "https://example.com", method: "GET", headers: {} }
    await kv.set(["mykey", request], { name: "with-context" })
    // Should retrieve with just the key
    const result = await kv.get(["mykey"])
    expect(result).toEqual({ name: "with-context" })
  })
})

describe("createBinaryFileKV", () => {
  it("get returns null for missing key", async () => {
    const kv = createBinaryFileKV(TEST_DIR, "data.bin")
    const result = await kv.get(["nonexistent"])
    expect(result).toBeNull()
  })

  it("set then get returns binary data", async () => {
    const kv = createBinaryFileKV(TEST_DIR, "data.bin")
    const data = new Uint8Array([1, 2, 3, 4, 5])
    await kv.set(["mykey"], data)
    const result = await kv.get(["mykey"])
    expect(result).toEqual(data)
  })

  it("has returns false for missing key", async () => {
    const kv = createBinaryFileKV(TEST_DIR, "data.bin")
    const result = await kv.has(["nonexistent"])
    expect(result).toBe(false)
  })

  it("has returns true after set", async () => {
    const kv = createBinaryFileKV(TEST_DIR, "data.bin")
    await kv.set(["mykey"], new Uint8Array([1, 2, 3]))
    const result = await kv.has(["mykey"])
    expect(result).toBe(true)
  })
})

describe("createJsonlFileKVStream", () => {
  const collectChunks = async (iterable: AsyncIterable<TimedChunk>): Promise<Array<TimedChunk>> => {
    const chunks: Array<TimedChunk> = []
    for await (const chunk of iterable) {
      chunks.push(chunk)
    }
    return chunks
  }

  it("get yields nothing for missing key", async () => {
    const kv = createJsonlFileKVStream(TEST_DIR, "chunks.jsonl")
    const chunks = await collectChunks(kv.get(["nonexistent"]))
    expect(chunks).toEqual([])
  })

  it("set then get yields chunks from array", async () => {
    const kv = createJsonlFileKVStream(TEST_DIR, "chunks.jsonl")
    const input: Array<TimedChunk> = [
      { data: "data: {\"message\":\"hello\"}\n\n", delay_ms: 0 },
      { data: "data: {\"message\":\"world\"}\n\n", delay_ms: 100 }
    ]
    await kv.set(["mykey"], input)
    const result = await collectChunks(kv.get(["mykey"]))
    expect(result).toHaveLength(2)
    expect(result[0]?.data).toContain("hello")
    expect(result[1]?.data).toContain("world")
  })

  it("set accepts async iterable", async () => {
    const kv = createJsonlFileKVStream(TEST_DIR, "chunks.jsonl")

    async function* generateChunks(): AsyncIterable<TimedChunk> {
      yield { data: "data: {\"n\":1}\n\n", delay_ms: 0 }
      yield { data: "data: {\"n\":2}\n\n", delay_ms: 50 }
    }

    await kv.set(["mykey"], generateChunks())
    const result = await collectChunks(kv.get(["mykey"]))
    expect(result).toHaveLength(2)
  })

  it("has returns false for missing key", async () => {
    const kv = createJsonlFileKVStream(TEST_DIR, "chunks.jsonl")
    const result = await kv.has(["nonexistent"])
    expect(result).toBe(false)
  })

  it("has returns true after set", async () => {
    const kv = createJsonlFileKVStream(TEST_DIR, "chunks.jsonl")
    await kv.set(["mykey"], [{ data: "data: test\n\n", delay_ms: 0 }])
    const result = await kv.has(["mykey"])
    expect(result).toBe(true)
  })
})

describe("createFlatFileStorage responseBody", () => {
  it("stores response body as raw JSON, not double-escaped string", async () => {
    // Import here to avoid circular deps at top level
    const { createFlatFileStorage } = await import("../src/flat-file-storage")
    const storage = createFlatFileStorage(TEST_DIR)

    // Simulate what the cache does: body is the raw response text (a JSON string)
    const responseBody = "{\"object\":\"response\",\"id\":\"gen-123\",\"output_text\":\"Hello!\"}"

    await storage.responseBody.set(["001"], responseBody)

    // When we read it back, it should be the same string
    const result = await storage.responseBody.get(["001"])
    expect(result).toBe(responseBody)

    // CRITICAL: The file on disk should be human-readable JSON, not an escaped string
    // Bad:  "{\"object\":\"response\"...}"  (double-escaped)
    // Good: {"object":"response"...}        (raw JSON)
    const fileContent = readFileSync(join(TEST_DIR, "001", "response.json"), "utf-8")
    expect(fileContent.startsWith("{")).toBe(true) // Should start with { not "
    expect(fileContent).toBe(responseBody)
  })
})
