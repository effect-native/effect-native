import { existsSync, mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { extractDataUrls, restoreDataUrls } from "../src/binary-extractor"

/**
 * Thing Golf Analysis: extractDataUrls/restoreDataUrls symmetry
 *
 * SafetyBad: MEDIUM - Regex-based extraction could miss edge cases
 * ChaosBad: HIGH - If extract/restore aren't symmetric, data is corrupted
 * BetrayalBad: HIGH - Users trust cached data to be identical to original
 *
 * Adversarial tests focus on:
 * - Round-trip symmetry: extract then restore should give original
 * - Multiple data URLs in same content
 * - Edge cases in base64 encoding
 */
describe("extractDataUrls/restoreDataUrls - round-trip symmetry", () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `dev-fetch-cache-test-${Date.now()}`)
    mkdirSync(testDir, {
      recursive: true
    })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, {
        recursive: true,
        force: true
      })
    }
  })

  it("round-trips a single PNG data URL", () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const original = `{"image": "data:image/png;base64,${pngBase64}"}`
    const assetsDir = join(testDir, "assets")

    const { content: extracted } = extractDataUrls(original, assetsDir)
    const restored = restoreDataUrls(extracted, assetsDir)

    expect(restored).toBe(original)
  })

  it("round-trips multiple data URLs of different types", () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const jpegBase64 =
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="
    const original = `{"images": ["data:image/png;base64,${pngBase64}", "data:image/jpeg;base64,${jpegBase64}"]}`
    const assetsDir = join(testDir, "assets")

    const { content: extracted, extractedFiles } = extractDataUrls(original, assetsDir)
    expect(extractedFiles).toHaveLength(2)

    const restored = restoreDataUrls(extracted, assetsDir)
    expect(restored).toBe(original)
  })

  it("preserves content without data URLs unchanged", () => {
    const original = "{\"message\": \"hello world\", \"count\": 42}"
    const assetsDir = join(testDir, "assets")

    const { content: extracted, extractedFiles } = extractDataUrls(original, assetsDir)
    expect(extractedFiles).toHaveLength(0)
    expect(extracted).toBe(original)

    const restored = restoreDataUrls(extracted, assetsDir)
    expect(restored).toBe(original)
  })

  it("handles data URL with padding characters in base64", () => {
    const base64WithPadding = "SGVsbG8gV29ybGQh"
    const original = `data:text/plain;base64,${base64WithPadding}`
    const assetsDir = join(testDir, "assets")

    const { content: extracted } = extractDataUrls(original, assetsDir)
    const restored = restoreDataUrls(extracted, assetsDir)

    expect(restored).toBe(original)
  })

  it("extracts files with correct extensions based on MIME type", () => {
    const pngBase64 = "iVBORw0KGgo="
    const wavBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    const original = `{"image": "data:image/png;base64,${pngBase64}", "audio": "data:audio/wav;base64,${wavBase64}"}`
    const assetsDir = join(testDir, "assets")

    const { extractedFiles } = extractDataUrls(original, assetsDir)

    expect(extractedFiles).toContain("0001.png")
    expect(extractedFiles).toContain("0002.wav")
  })

  it("uses .bin extension for unknown MIME types", () => {
    const base64 = "SGVsbG8="
    const original = `data:application/x-custom-type;base64,${base64}`
    const assetsDir = join(testDir, "assets")

    const { extractedFiles } = extractDataUrls(original, assetsDir)

    expect(extractedFiles[0]).toMatch(/\.bin$/)
  })
})

describe("restoreDataUrls - missing file handling", () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `dev-fetch-cache-test-${Date.now()}`)
    mkdirSync(testDir, {
      recursive: true
    })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, {
        recursive: true,
        force: true
      })
    }
  })

  it("preserves sidecar reference when file is missing", () => {
    const contentWithSidecar = "{\"image\": \"data:image/png;base64,__sidecar:0001.png__\"}"
    const assetsDir = join(testDir, "nonexistent-assets")

    const restored = restoreDataUrls(contentWithSidecar, assetsDir)

    expect(restored).toBe(contentWithSidecar)
  })
})
