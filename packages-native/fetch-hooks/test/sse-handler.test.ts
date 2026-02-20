import { describe, expect, it } from "bun:test"
import { jsonlToTimedChunks, timedChunksToJsonl } from "../src/sse-handler"

/**
 * Thing Golf Analysis: jsonlToTimedChunks parsing
 *
 * SafetyBad: MEDIUM - Uses JSON.parse without validation, could throw
 * BetrayalBad: MEDIUM - If parsing fails silently or incorrectly, replay is wrong
 *
 * Adversarial tests focus on:
 * - Round-trip symmetry: serialize then deserialize should give original
 * - Malformed input handling
 * - Edge cases in JSONL format
 *
 * Note: New serialization format extracts SSE payloads and stores timing as separate lines.
 * Each data chunk becomes a {"json": ...} or {"text": ...} record, and delays between
 * chunks are stored as separate {"delay_ms": ...} records.
 */
/**
 * BUG FIX TEST: Multiple SSE events per network chunk
 *
 * Real SSE streams from APIs like OpenRouter often batch multiple events
 * into a single network chunk. The original implementation of timedChunksToJsonl
 * only extracted the FIRST event from each chunk, losing critical events like
 * `response.completed`.
 *
 * This caused "Stream ended without completion event" errors when replaying
 * cached responses.
 */
describe("timedChunksToJsonl - multiple events per chunk", () => {
  it("extracts ALL events when multiple SSE events are batched in one chunk", () => {
    // This simulates real network behavior where multiple events arrive together
    const chunks = [
      {
        // Chunk with 2 events batched together (common in real SSE streams)
        data: "data: {\"type\":\"response.created\",\"id\":\"123\"}\n\ndata: {\"type\":\"response.in_progress\"}\n\n",
        delay_ms: 0
      },
      {
        // Single event chunk
        data: "data: {\"type\":\"response.output_text.delta\",\"delta\":\"hi\"}\n\n",
        delay_ms: 50
      },
      {
        // Final chunk with 3 events including the critical response.completed
        data:
          "data: {\"type\":\"response.output_text.done\",\"text\":\"hi\"}\n\ndata: {\"type\":\"response.output_item.done\"}\n\ndata: {\"type\":\"response.completed\",\"status\":\"completed\"}\n\n",
        delay_ms: 100
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const restored = jsonlToTimedChunks(jsonl)

    // Extract all event types from restored chunks
    const eventTypes = restored.map((chunk) => {
      const match = chunk.data.match(/"type":"([^"]+)"/)
      return match?.[1]
    })

    // ALL 6 events must be preserved, especially response.completed
    expect(eventTypes).toEqual([
      "response.created",
      "response.in_progress",
      "response.output_text.delta",
      "response.output_text.done",
      "response.output_item.done",
      "response.completed"
    ])
  })

  it("preserves timing information when splitting multi-event chunks", () => {
    const chunks = [
      {
        data: "data: {\"type\":\"event1\"}\n\ndata: {\"type\":\"event2\"}\n\n",
        delay_ms: 0
      },
      {
        data: "data: {\"type\":\"event3\"}\n\n",
        delay_ms: 100
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const restored = jsonlToTimedChunks(jsonl)

    // First two events came in same chunk, so both have delay 0
    expect(restored[0]?.delay_ms).toBe(0)
    expect(restored[1]?.delay_ms).toBe(0)
    // Third event came after 100ms delay
    expect(restored[2]?.delay_ms).toBe(100)
  })
})

describe("timedChunksToJsonl/jsonlToTimedChunks - round-trip symmetry", () => {
  it("round-trips a single chunk", () => {
    const original = [
      {
        data: "data: hello\n\n",
        delay_ms: 0
      }
    ]

    const jsonl = timedChunksToJsonl(original)
    const restored = jsonlToTimedChunks(jsonl)

    expect(restored).toEqual(original)
  })

  it("round-trips multiple chunks with varying delays", () => {
    const original = [
      {
        data: "data: {}\n\n",
        delay_ms: 0
      },
      {
        data: "data: {\"content\":\"hello\"}\n\n",
        delay_ms: 150
      },
      {
        data: "data: {\"content\":\"world\"}\n\n",
        delay_ms: 50
      },
      {
        data: "data: [DONE]\n\n",
        delay_ms: 200
      }
    ]

    const jsonl = timedChunksToJsonl(original)
    const restored = jsonlToTimedChunks(jsonl)

    expect(restored).toEqual(original)
  })

  it("preserves JSON payloads and timing across round-trip", () => {
    const original = [
      {
        data: "data: {\"text\":\"line1\\nline2\\ttab\"}\n\n",
        delay_ms: 0
      },
      {
        data: "data: {\"emoji\":\"heart\"}\n\n",
        delay_ms: 20
      }
    ]

    const jsonl = timedChunksToJsonl(original)
    const restored = jsonlToTimedChunks(jsonl)

    expect(restored).toEqual(original)
  })

  it("handles non-empty chunk data round-trip", () => {
    const original = [
      {
        data: "data: test\n\n",
        delay_ms: 0
      }
    ]

    const jsonl = timedChunksToJsonl(original)
    const restored = jsonlToTimedChunks(jsonl)

    expect(restored).toEqual(original)
  })
})

describe("jsonlToTimedChunks - edge cases", () => {
  it("filters out empty lines", () => {
    const jsonl = `{"text":"chunk1"}
{"delay_ms":10}
{"text":"chunk2"}
   
{"delay_ms":30}
{"text":"chunk3"}`

    const result = jsonlToTimedChunks(jsonl)

    expect(result).toHaveLength(3)
    expect(result[0]?.data).toBe("data: chunk1\n\n")
    expect(result[1]?.data).toBe("data: chunk2\n\n")
    expect(result[2]?.data).toBe("data: chunk3\n\n")
  })

  it("handles single line without trailing newline", () => {
    const jsonl = "{\"text\":\"only chunk\"}"

    const result = jsonlToTimedChunks(jsonl)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      data: "data: only chunk\n\n",
      delay_ms: 0
    })
  })

  it("throws on malformed JSON", () => {
    const malformedJsonl = "{\"text\":\"valid\"}\n{invalid json}"

    expect(() => jsonlToTimedChunks(malformedJsonl)).toThrow()
  })

  it("handles delay lines that come before data", () => {
    const jsonl = `{"delay_ms":100}
{"text":"delayed chunk"}`

    const result = jsonlToTimedChunks(jsonl)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      data: "data: delayed chunk\n\n",
      delay_ms: 100
    })
  })

  it("handles JSON payloads in new format", () => {
    const jsonl = `{"json":{"type":"start","content":{}}}
{"delay_ms":50}
{"json":{"type":"message","content":"hello"}}`

    const result = jsonlToTimedChunks(jsonl)

    expect(result).toHaveLength(2)
    expect(result[0]?.data).toBe("data: {\"type\":\"start\",\"content\":{}}\n\n")
    expect(result[0]?.delay_ms).toBe(0)
    expect(result[1]?.data).toBe("data: {\"type\":\"message\",\"content\":\"hello\"}\n\n")
    expect(result[1]?.delay_ms).toBe(50)
  })
})

/**
 * BUG FIX TEST: SSE comment lines
 *
 * SSE protocol supports comment lines that start with ':' (colon).
 * These are used by servers for keep-alive pings or status messages.
 * OpenRouter sends `: OPENROUTER PROCESSING` comments while waiting.
 *
 * The bug: Comment lines were being stored as {"text": ": OPENROUTER PROCESSING\n\n"}
 * and replayed as `data: : OPENROUTER PROCESSING\n\n`, which the SDK then tries
 * to parse as JSON, causing a ZodError.
 *
 * Fix: Comment-only chunks should be stored with a "comment" field and replayed
 * as raw comments (without the "data:" prefix).
 */
describe("timedChunksToJsonl - SSE comment handling", () => {
  it("stores SSE comment lines separately from data lines", () => {
    const chunks = [
      {
        // Comment-only chunk (no data: prefix in original SSE)
        data: ": OPENROUTER PROCESSING\n\n",
        delay_ms: 0
      },
      {
        data: "data: {\"type\":\"response.created\"}\n\n",
        delay_ms: 100
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const lines = jsonl.split("\n").map((line) => JSON.parse(line))

    // Comment should be stored with "comment" field, not "text"
    expect(lines[0]).toEqual({ comment: ": OPENROUTER PROCESSING\n\n" })
  })

  it("round-trips SSE comment lines correctly", () => {
    const original = [
      {
        data: ": OPENROUTER PROCESSING\n\n",
        delay_ms: 0
      },
      {
        data: "data: {\"type\":\"response.created\"}\n\n",
        delay_ms: 100
      },
      {
        data: ": keep-alive\n\n",
        delay_ms: 50
      },
      {
        data: "data: {\"type\":\"response.completed\"}\n\n",
        delay_ms: 200
      }
    ]

    const jsonl = timedChunksToJsonl(original)
    const restored = jsonlToTimedChunks(jsonl)

    // Comments should be preserved as-is (without data: prefix)
    expect(restored).toEqual(original)
  })

  it("handles mixed comment and data in same chunk", () => {
    // Some servers may send comments and data in the same network chunk
    const chunks = [
      {
        data: ": ping\n\ndata: {\"type\":\"event\"}\n\n",
        delay_ms: 0
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const restored = jsonlToTimedChunks(jsonl)

    // Should produce two chunks: one comment, one data
    expect(restored).toHaveLength(2)
    expect(restored[0]?.data).toBe(": ping\n\n")
    expect(restored[1]?.data).toBe("data: {\"type\":\"event\"}\n\n")
  })
})

describe("timedChunksToJsonl - output format", () => {
  it("produces valid JSONL with proper line structure", () => {
    const chunks = [
      {
        data: "data: chunk1\n\n",
        delay_ms: 10
      },
      {
        data: "data: chunk2\n\n",
        delay_ms: 20
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const lines = jsonl.split("\n")

    // Should be: data1, delay_for_data2, data2 (no delay after last chunk)
    expect(lines).toHaveLength(3)
    expect(() => JSON.parse(lines[0]!)).not.toThrow()
    expect(() => JSON.parse(lines[1]!)).not.toThrow()
    expect(() => JSON.parse(lines[2]!)).not.toThrow()
  })

  it("stores timing as separate delay_ms records between chunks", () => {
    const chunks = [
      {
        data: "data: first\n\n",
        delay_ms: 0
      },
      {
        data: "data: second\n\n",
        delay_ms: 42
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const lines = jsonl.split("\n").map((line) => JSON.parse(line))

    expect(lines[0]).toEqual({ text: "first" })
    expect(lines[1]).toEqual({ delay_ms: 42 })
    expect(lines[2]).toEqual({ text: "second" })
  })

  it("does not add delay record after last chunk", () => {
    const chunks = [
      {
        data: "data: only\n\n",
        delay_ms: 0
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const lines = jsonl.split("\n")

    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0]!)).toEqual({ text: "only" })
  })

  it("extracts and stores JSON payloads", () => {
    const chunks = [
      {
        data: "data: {\"type\":\"message\",\"content\":\"hello\"}\n\n",
        delay_ms: 0
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const parsed = JSON.parse(jsonl)

    expect(parsed).toEqual({
      json: { type: "message", content: "hello" }
    })
  })

  it("stores non-JSON payloads as text", () => {
    const chunks = [
      {
        data: "data: [DONE]\n\n",
        delay_ms: 0
      }
    ]

    const jsonl = timedChunksToJsonl(chunks)
    const parsed = JSON.parse(jsonl)

    expect(parsed).toEqual({
      text: "[DONE]"
    })
  })
})
