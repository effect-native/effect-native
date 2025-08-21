import { Cookies, HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { assert, describe, it } from "@effect/vitest"
import { Chunk, Effect, Layer, Option, Stream } from "effect"
import * as ExpoHttpClient from "../src/ExpoHttpClient"

// Mock fetch for testing
const mockFetch = (
  responses: Record<string, { status?: number; headers?: Record<string, string>; body?: unknown }>
) => {
  const fetch = async (url: string, init?: RequestInit) => {
    const response = responses[url] || { status: 404, body: "Not Found" }
    const headers = new Headers(response.headers || {})

    let body: BodyInit | null = null
    if (response.body !== undefined) {
      if (typeof response.body === "string") {
        body = response.body
      } else {
        body = JSON.stringify(response.body)
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json")
        }
      }
    }

    return new Response(body, {
      status: response.status || 200,
      headers
    })
  }

  return Layer.succeed(ExpoHttpClient.Fetch, fetch as typeof globalThis.fetch)
}

describe("ExpoHttpClient", () => {
  describe("Basic requests", () => {
    it.effect("GET request with JSON response", () =>
      Effect.gen(function*() {
        const body = yield* HttpClient.get("http://localhost:8080/api/data").pipe(
          Effect.flatMap((_) => _.json),
          Effect.scoped
        )
        assert.deepStrictEqual(body, { message: "Success!", data: [1, 2, 3] })
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/api/data": {
            body: { message: "Success!", data: [1, 2, 3] }
          }
        }))
      ))

    it.effect("POST request with JSON body", () =>
      Effect.gen(function*() {
        const body = yield* HttpClient.post("http://localhost:8080/api/create").pipe(
          HttpClientRequest.jsonBody({ name: "test", value: 42 }),
          Effect.flatMap((_) => _.json),
          Effect.scoped
        )
        assert.deepStrictEqual(body, { id: 123, created: true })
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/api/create": {
            status: 201,
            body: { id: 123, created: true }
          }
        }))
      ))

    it.effect("PUT request", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.put("http://localhost:8080/api/update/123").pipe(
          HttpClientRequest.jsonBody({ name: "updated" }),
          Effect.scoped
        )
        assert.strictEqual(response.status, 200)
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/api/update/123": {
            status: 200,
            body: { success: true }
          }
        }))
      ))

    it.effect("DELETE request", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.del("http://localhost:8080/api/delete/123").pipe(
          Effect.scoped
        )
        assert.strictEqual(response.status, 204)
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/api/delete/123": {
            status: 204
          }
        }))
      ))
  })

  describe("Response handling", () => {
    it.effect("text response", () =>
      Effect.gen(function*() {
        const body = yield* HttpClient.get("http://localhost:8080/text").pipe(
          Effect.flatMap((_) => _.text),
          Effect.scoped
        )
        assert.strictEqual(body, "Hello, World!")
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/text": {
            headers: { "content-type": "text/plain" },
            body: "Hello, World!"
          }
        }))
      ))

    it.effect("arrayBuffer response", () =>
      Effect.gen(function*() {
        const body = yield* HttpClient.get("http://localhost:8080/binary").pipe(
          Effect.flatMap((_) => _.arrayBuffer),
          Effect.scoped
        )
        const text = new TextDecoder().decode(body)
        assert.strictEqual(text, "Binary data")
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/binary": {
            headers: { "content-type": "application/octet-stream" },
            body: "Binary data"
          }
        }))
      ))

    it.effect("stream response", () =>
      Effect.gen(function*() {
        const body = yield* HttpClient.get("http://localhost:8080/stream").pipe(
          Effect.map((_) =>
            _.stream.pipe(
              Stream.decodeText(),
              Stream.mkString
            )
          ),
          Stream.unwrapScoped,
          Stream.runCollect
        )
        assert.deepStrictEqual(Chunk.unsafeHead(body), "Streaming content")
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/stream": {
            body: "Streaming content"
          }
        }))
      ))
  })

  describe("Headers and cookies", () => {
    it.effect("custom headers", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.get("http://localhost:8080/headers").pipe(
          HttpClientRequest.setHeader("Authorization", "Bearer token123"),
          HttpClientRequest.setHeader("X-Custom-Header", "value"),
          Effect.scoped
        )
        assert.strictEqual(response.status, 200)
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/headers": {
            body: { received: true }
          }
        }))
      ))

    it.effect("response headers", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.get("http://localhost:8080/response-headers").pipe(
          Effect.scoped
        )
        const contentType = response.headers["content-type"]
        assert.strictEqual(contentType, "application/json")
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/response-headers": {
            headers: {
              "content-type": "application/json",
              "x-custom": "header-value"
            },
            body: {}
          }
        }))
      ))

    it.effect("cookies", () =>
      Effect.gen(function*() {
        const cookies = yield* HttpClient.get("http://localhost:8080/cookies").pipe(
          Effect.map((res) => res.cookies),
          Effect.scoped
        )
        assert.deepStrictEqual(Cookies.toRecord(cookies), {
          sessionId: "abc123",
          preference: "dark"
        })
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/cookies": {
            headers: {
              "set-cookie": "sessionId=abc123; HttpOnly; Secure, preference=dark"
            },
            body: {}
          }
        }))
      ))
  })

  describe("Error handling", () => {
    it.effect("404 error", () =>
      Effect.gen(function*() {
        const error = yield* HttpClient.get("http://localhost:8080/not-found").pipe(
          Effect.flip,
          Effect.scoped
        )
        assert(HttpClientError.isResponseError(error))
        if (HttpClientError.isResponseError(error)) {
          assert.strictEqual(error.response.status, 404)
        }
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/not-found": {
            status: 404,
            body: "Not Found"
          }
        }))
      ))

    it.effect("500 error", () =>
      Effect.gen(function*() {
        const error = yield* HttpClient.get("http://localhost:8080/server-error").pipe(
          Effect.flip,
          Effect.scoped
        )
        assert(HttpClientError.isResponseError(error))
        if (HttpClientError.isResponseError(error)) {
          assert.strictEqual(error.response.status, 500)
        }
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/server-error": {
            status: 500,
            body: { error: "Internal Server Error" }
          }
        }))
      ))
  })

  describe("Request options", () => {
    it.effect("URL search params", () =>
      Effect.gen(function*() {
        const response = yield* HttpClient.get("http://localhost:8080/search").pipe(
          HttpClientRequest.setUrlParam("q", "test"),
          HttpClientRequest.setUrlParam("limit", "10"),
          Effect.scoped
        )
        assert.strictEqual(response.status, 200)
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/search?q=test&limit=10": {
            body: { results: [] }
          }
        }))
      ))

    it.effect("form data", () =>
      Effect.gen(function*() {
        const formData = new FormData()
        formData.append("field1", "value1")
        formData.append("field2", "value2")

        const response = yield* HttpClient.post("http://localhost:8080/form").pipe(
          HttpClientRequest.formDataBody(formData),
          Effect.scoped
        )
        assert.strictEqual(response.status, 200)
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/form": {
            body: { received: true }
          }
        }))
      ))
  })

  describe("Client configuration", () => {
    it.effect("with retry", () =>
      Effect.gen(function*() {
        let attempts = 0
        const mockLayer = Layer.succeed(
          ExpoHttpClient.Fetch,
          (async (url: string) => {
            attempts++
            if (attempts < 3) {
              return new Response(null, { status: 503 })
            }
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { "content-type": "application/json" }
            })
          }) as typeof globalThis.fetch
        )

        const client = HttpClient.retry(
          HttpClient.client.pipe(HttpClient.filterStatusOk),
          { times: 3 }
        )

        const response = yield* client.get("http://localhost:8080/retry").pipe(
          Effect.flatMap((_) => _.json),
          Effect.scoped
        )

        assert.deepStrictEqual(response, { success: true })
        assert.strictEqual(attempts, 3)
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(Layer.succeed(
          ExpoHttpClient.Fetch,
          (async (url: string) => {
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { "content-type": "application/json" }
            })
          }) as typeof globalThis.fetch
        ))
      ))

    it.effect("with timeout", () =>
      Effect.gen(function*() {
        const client = HttpClient.client.pipe(
          HttpClient.timeout(100)
        )

        // This would timeout in a real scenario with a slow server
        const response = yield* client.get("http://localhost:8080/timeout").pipe(
          Effect.scoped
        )
        assert.strictEqual(response.status, 200)
      }).pipe(
        Effect.provide(ExpoHttpClient.layer),
        Effect.provide(mockFetch({
          "http://localhost:8080/timeout": {
            body: { fast: true }
          }
        }))
      ))
  })
})
