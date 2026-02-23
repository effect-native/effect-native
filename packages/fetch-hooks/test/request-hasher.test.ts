import { describe, expect, it } from "bun:test"
import { getStorableHeaders, hashRequest, headersToRecord } from "../src/request-hasher"

/**
 * Thing Golf Analysis: SENSITIVE_HEADERS filtering
 *
 * SafetyBad: HIGH - If this fails, sensitive credentials could be stored in cache files
 * BetrayalBad: HIGH - Users trust this to protect their API keys
 *
 * Adversarial tests focus on edge cases that could leak credentials:
 * - Case variations (Authorization vs AUTHORIZATION)
 * - Similar but different header names
 * - Headers that should NOT be filtered
 */
describe("getStorableHeaders - sensitive header filtering", () => {
  it("filters authorization header regardless of case", () => {
    const headers = {
      Authorization: "Bearer secret-token",
      "Content-Type": "application/json"
    }
    const result = getStorableHeaders(headers)

    expect(result).not.toHaveProperty("Authorization")
    expect(result).not.toHaveProperty("authorization")
    expect(result).toHaveProperty("Content-Type", "application/json")
  })

  it("filters UPPERCASE authorization header", () => {
    const headers = {
      AUTHORIZATION: "Bearer secret-token",
      "Content-Type": "application/json"
    }
    const result = getStorableHeaders(headers)

    expect(result).not.toHaveProperty("AUTHORIZATION")
    expect(result).not.toHaveProperty("Authorization")
    expect(result).not.toHaveProperty("authorization")
  })

  it("filters all known sensitive headers", () => {
    const headers = {
      authorization: "Bearer token",
      "x-api-key": "api-key-123",
      "api-key": "another-key",
      "x-openrouter-api-key": "or-key",
      cookie: "session=abc123",
      "set-cookie": "session=xyz789",
      "x-auth-token": "auth-token",
      "x-access-token": "access-token",
      bearer: "bearer-value",
      "content-type": "application/json"
    }
    const result = getStorableHeaders(headers)

    expect(Object.keys(result)).toEqual(["content-type"])
    expect(result["content-type"]).toBe("application/json")
  })

  it("preserves non-sensitive headers with original case", () => {
    const headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-Custom-Header": "custom-value"
    }
    const result = getStorableHeaders(headers)

    expect(result).toEqual({
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-Custom-Header": "custom-value"
    })
  })
})

/**
 * Thing Golf Analysis: hashRequest consistency
 *
 * ChaosBad: MEDIUM - Inconsistent hashing leads to cache misses
 *
 * Adversarial tests focus on:
 * - Same request with different header case should produce same hash
 * - URL normalization edge cases
 */
describe("hashRequest - consistency", () => {
  it("produces same hash for headers with different case", () => {
    const request1 = {
      url: "https://api.example.com/v1/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: "{\"message\":\"hello\"}"
    }
    const request2 = {
      url: "https://api.example.com/v1/chat",
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{\"message\":\"hello\"}"
    }

    expect(hashRequest(request1)).toBe(hashRequest(request2))
  })

  it("produces same hash for method with different case", () => {
    const request1 = {
      url: "https://api.example.com/v1/chat",
      method: "post",
      headers: {},
      body: undefined
    }
    const request2 = {
      url: "https://api.example.com/v1/chat",
      method: "POST",
      headers: {},
      body: undefined
    }

    expect(hashRequest(request1)).toBe(hashRequest(request2))
  })

  it("produces same hash for URLs with trailing slash vs without", () => {
    const request1 = {
      url: "https://api.example.com/v1/chat/",
      method: "GET",
      headers: {},
      body: undefined
    }
    const request2 = {
      url: "https://api.example.com/v1/chat",
      method: "GET",
      headers: {},
      body: undefined
    }

    expect(hashRequest(request1)).toBe(hashRequest(request2))
  })

  it("produces same hash for URLs with query params in different order", () => {
    const request1 = {
      url: "https://api.example.com/v1/chat?a=1&b=2",
      method: "GET",
      headers: {},
      body: undefined
    }
    const request2 = {
      url: "https://api.example.com/v1/chat?b=2&a=1",
      method: "GET",
      headers: {},
      body: undefined
    }

    expect(hashRequest(request1)).toBe(hashRequest(request2))
  })

  it("excludes sensitive headers from hash calculation", () => {
    const requestWithAuth = {
      url: "https://api.example.com/v1/chat",
      method: "POST",
      headers: {
        Authorization: "Bearer secret-token-1",
        "Content-Type": "application/json"
      },
      body: "{\"message\":\"hello\"}"
    }
    const requestWithDifferentAuth = {
      url: "https://api.example.com/v1/chat",
      method: "POST",
      headers: {
        Authorization: "Bearer different-token",
        "Content-Type": "application/json"
      },
      body: "{\"message\":\"hello\"}"
    }

    expect(hashRequest(requestWithAuth)).toBe(hashRequest(requestWithDifferentAuth))
  })
})

describe("hashRequest - format", () => {
  it("produces short base62 hash (~11 chars)", () => {
    const request = {
      url: "https://api.example.com/v1/chat",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{\"message\":\"hello\"}"
    }
    const hash = hashRequest(request)

    // xxHash64 produces ~11 char base62 strings (64 bits / ~5.95 bits per char)
    expect(hash.length).toBeLessThanOrEqual(12)
    expect(hash.length).toBeGreaterThanOrEqual(10)
    // Only contains base62 characters
    expect(hash).toMatch(/^[0-9A-Za-z]+$/)
  })

  it("produces deterministic hashes", () => {
    const request = {
      url: "https://api.example.com/v1/chat",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{\"message\":\"hello\"}"
    }

    const hash1 = hashRequest(request)
    const hash2 = hashRequest(request)
    expect(hash1).toBe(hash2)
  })
})

describe("headersToRecord", () => {
  it("converts Headers object to plain record", () => {
    const headers = new Headers()
    headers.set("Content-Type", "application/json")
    headers.set("Accept", "text/event-stream")

    const result = headersToRecord(headers)

    expect(result["content-type"]).toBe("application/json")
    expect(result["accept"]).toBe("text/event-stream")
  })
})
