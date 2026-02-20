import assert from "node:assert"
import { describe, it } from "@effect-native/bun-test"
import * as OR from "@openrouter/sdk"
import { Effect, Layer } from "effect"
import { OpenRouter, OpenRouterClientConfig } from "../src/index.js"

/**
 * Creates a mock HTTPClient with a custom fetcher that returns predefined responses.
 * This allows testing OpenRouter without making real API calls.
 */
function createMockHttpClient(mockFetch: typeof globalThis.fetch) {
  return new OR.HTTPClient({
    fetcher: mockFetch
  })
}

/**
 * Real SSE response captured from OpenRouter API via the dev-fetch-cache.
 * This is what the API actually returns for a simple "say hello" request.
 */
const REAL_SSE_RESPONSE_JSONL =
  `{"json":{"type":"response.created","response":{"object":"response","id":"gen-1766801159-e9nTRO0vtJdg1Gc8Vsv9","created_at":1766801159,"status":"in_progress","error":null,"output_text":"","output":[],"model":"openai/gpt-4o","incomplete_details":null,"max_tool_calls":null,"tools":[],"tool_choice":"auto","parallel_tool_calls":true,"max_output_tokens":null,"temperature":null,"top_p":null,"metadata":{},"background":false,"previous_response_id":null,"service_tier":"auto","truncation":null,"store":false,"instructions":null,"reasoning":null,"safety_identifier":null,"prompt_cache_key":null,"user":null},"sequence_number":0}}
{"json":{"type":"response.in_progress","response":{"object":"response","id":"gen-1766801159-e9nTRO0vtJdg1Gc8Vsv9","created_at":1766801159,"status":"in_progress","error":null,"output_text":"","output":[],"model":"openai/gpt-4o","incomplete_details":null,"max_tool_calls":null,"tools":[],"tool_choice":"auto","parallel_tool_calls":true,"max_output_tokens":null,"temperature":null,"top_p":null,"metadata":{},"background":false,"previous_response_id":null,"service_tier":"auto","truncation":null,"store":false,"instructions":null,"reasoning":null,"safety_identifier":null,"prompt_cache_key":null,"user":null},"sequence_number":1}}
{"json":{"type":"response.output_item.added","output_index":0,"item":{"type":"message","status":"in_progress","content":[],"id":"msg_tmp_qife5pjb33c","role":"assistant"},"sequence_number":2}}
{"json":{"type":"response.content_part.added","item_id":"msg_tmp_qife5pjb33c","output_index":0,"content_index":0,"part":{"type":"output_text","annotations":[],"text":""},"sequence_number":3}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":"Hello","sequence_number":4}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":"!","sequence_number":5}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":" How","sequence_number":6}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":" can","sequence_number":7}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":" I","sequence_number":8}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":" assist","sequence_number":9}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":" you","sequence_number":10}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":" today","sequence_number":11}}
{"json":{"type":"response.output_text.delta","logprobs":[],"output_index":0,"item_id":"msg_tmp_qife5pjb33c","content_index":0,"delta":"?","sequence_number":12}}
{"json":{"type":"response.output_text.done","item_id":"msg_tmp_qife5pjb33c","output_index":0,"content_index":0,"text":"Hello! How can I assist you today?","logprobs":[],"sequence_number":13}}
{"json":{"type":"response.content_part.done","item_id":"msg_tmp_qife5pjb33c","output_index":0,"content_index":0,"part":{"type":"output_text","annotations":[],"text":"Hello! How can I assist you today?"},"sequence_number":14}}
{"json":{"type":"response.output_item.done","output_index":0,"item":{"type":"message","status":"completed","content":[{"type":"output_text","text":"Hello! How can I assist you today?","annotations":[]}],"id":"msg_tmp_qife5pjb33c","role":"assistant"},"sequence_number":15}}
{"json":{"type":"response.completed","response":{"object":"response","id":"gen-1766801159-e9nTRO0vtJdg1Gc8Vsv9","created_at":1766801159,"model":"openai/gpt-4o","status":"completed","output":[{"type":"message","status":"completed","content":[{"type":"output_text","text":"Hello! How can I assist you today?","annotations":[]}],"id":"msg_tmp_qife5pjb33c","role":"assistant"}],"output_text":"","error":null,"incomplete_details":null,"usage":{"input_tokens":9,"input_tokens_details":{"cached_tokens":0},"output_tokens":9,"output_tokens_details":{"reasoning_tokens":0},"total_tokens":18,"cost":0.0001125,"is_byok":false,"cost_details":{"upstream_inference_cost":null,"upstream_inference_input_cost":0.0000225,"upstream_inference_output_cost":0.00009}},"max_tool_calls":null,"tools":[],"tool_choice":"auto","parallel_tool_calls":true,"max_output_tokens":null,"temperature":null,"top_p":null,"metadata":{},"background":false,"previous_response_id":null,"service_tier":"auto","truncation":null,"store":false,"instructions":null,"reasoning":null,"safety_identifier":null,"prompt_cache_key":null,"user":null},"sequence_number":16}}
{"text":"[DONE]"}`

type JsonlRecord = { json: unknown } | { text: string } | { comment: string } | { delay_ms: number }

interface TimedChunk {
  data: string
  delay_ms: number
}

/**
 * Parse JSONL format to TimedChunk array.
 * Ported from dev-fetch-cache/src/sse-handler.ts jsonlToTimedChunks
 */
function jsonlToTimedChunks(jsonl: string): Array<TimedChunk> {
  const lines = jsonl.split("\n").filter((line) => line.trim().length > 0)
  const chunks: Array<TimedChunk> = []
  let pendingDelay = 0

  for (const line of lines) {
    const parsed = JSON.parse(line) as JsonlRecord

    // Handle timing lines
    if ("delay_ms" in parsed) {
      pendingDelay = parsed.delay_ms
      continue
    }

    // Handle {json: ...}
    if ("json" in parsed) {
      chunks.push({
        data: `data: ${JSON.stringify(parsed.json)}\n\n`,
        delay_ms: pendingDelay
      })
      pendingDelay = 0
      continue
    }

    // Handle {text: ...}
    if ("text" in parsed) {
      chunks.push({
        data: `data: ${parsed.text}\n\n`,
        delay_ms: pendingDelay
      })
      pendingDelay = 0
      continue
    }

    // Handle {comment: ...}
    if ("comment" in parsed) {
      chunks.push({
        data: parsed.comment,
        delay_ms: pendingDelay
      })
      pendingDelay = 0
      continue
    }
  }

  return chunks
}

/**
 * Replay TimedChunks as a ReadableStream (without actual delays for testing).
 * Ported from dev-fetch-cache/src/sse-handler.ts replayStreamWithTiming
 */
function replayStreamWithoutTiming(timedChunks: Array<TimedChunk>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let chunkIndex = 0

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunkIndex >= timedChunks.length) {
        controller.close()
        return
      }

      const chunk = timedChunks[chunkIndex]!
      controller.enqueue(encoder.encode(chunk.data))
      chunkIndex++
    }
  })
}

/**
 * Create a mock SSE Response from JSONL cache data.
 */
function createMockSSEResponse(jsonl: string): Response {
  const timedChunks = jsonlToTimedChunks(jsonl)
  const stream = replayStreamWithoutTiming(timedChunks)

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream"
    }
  })
}

describe("OpenRouter.callModel", () => {
  it("returns text from a mocked streaming response", async () => {
    const mockHttpClient = createMockHttpClient(async (_request) => {
      return createMockSSEResponse(REAL_SSE_RESPONSE_JSONL)
    })

    const testLayer = OpenRouter.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(
        OpenRouterClientConfig.layer({
          apiKey: "mock-api-key",
          httpClient: mockHttpClient
        })
      )
    )

    const result = await Effect.gen(function*() {
      const openrouter = yield* OpenRouter
      const callResult = yield* openrouter.callModel({
        model: "openai/gpt-4o",
        input: "say hello"
      })
      return yield* callResult.text
    }).pipe(Effect.scoped, Effect.provide(testLayer), Effect.runPromise)

    assert.strictEqual(result, "Hello! How can I assist you today?")
  })

  it("returns response metadata including id", async () => {
    const mockHttpClient = createMockHttpClient(async (_request) => {
      return createMockSSEResponse(REAL_SSE_RESPONSE_JSONL)
    })

    const testLayer = OpenRouter.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(
        OpenRouterClientConfig.layer({
          apiKey: "mock-api-key",
          httpClient: mockHttpClient
        })
      )
    )

    const response = await Effect.gen(function*() {
      const openrouter = yield* OpenRouter
      const callResult = yield* openrouter.callModel({
        model: "openai/gpt-4o",
        input: "say hello"
      })
      return yield* callResult.response
    }).pipe(Effect.scoped, Effect.provide(testLayer), Effect.runPromise)

    assert.strictEqual(response.id, "gen-1766801159-e9nTRO0vtJdg1Gc8Vsv9")
    assert.strictEqual(response.model, "openai/gpt-4o")
    assert.strictEqual(response.status, "completed")
  })

  it("passes the request to the mock fetcher with correct auth header", async () => {
    let capturedRequest: Request

    const mockHttpClient = createMockHttpClient(async (request) => {
      if (request && typeof request === "object" && "clone" in request) {
        capturedRequest = request.clone()
      }
      return createMockSSEResponse(REAL_SSE_RESPONSE_JSONL)
    })

    const testLayer = OpenRouter.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(
        OpenRouterClientConfig.layer({
          apiKey: "test-api-key-12345",
          httpClient: mockHttpClient
        })
      )
    )

    await Effect.gen(function*() {
      const openrouter = yield* OpenRouter
      const callResult = yield* openrouter.callModel({
        model: "anthropic/claude-3-opus",
        input: "Test message"
      })
      return yield* callResult.text
    }).pipe(Effect.scoped, Effect.provide(testLayer), Effect.runPromise)

    const body = await capturedRequest!.json()
    assert.strictEqual(body.model, "anthropic/claude-3-opus")
    assert.include(capturedRequest!.headers.get("Authorization"), "test-api-key-12345")
  })
})
