/**
 * @since 0.0.1
 */
import * as Headers from "@effect/platform/Headers"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { logDemo, logResult, logSection, withTiming } from "./utils/DemoHelpers.js"

/**
 * @since 0.0.1
 * @category schemas
 */
const Post = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  body: Schema.String
})
type Post = typeof Post.Type

/**
 * @since 0.0.1
 * @category schemas
 */
const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  username: Schema.String,
  email: Schema.String
})
type User = typeof User.Type

/**
 * @since 0.0.1
 * @category demos
 * @example
 * ```ts
 * import * as HttpClientDemo from "@effect-native/platform-demo/HttpClientDemo"
 * import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 *
 * Effect.provide(
 *   HttpClientDemo.basicRequests,
 *   NodeHttpClient.layer
 * ).pipe(Effect.runPromise)
 * ```
 */
export const basicRequests = Effect.gen(function*() {
  yield* logSection("HTTP Client Basic Requests")

  const client = yield* HttpClient.HttpClient

  yield* logDemo("GET Request", "Fetching a post")
  const getResponse = yield* client.get("https://jsonplaceholder.typicode.com/posts/1").pipe(
    Effect.flatMap(HttpClientResponse.json),
    Effect.flatMap(Schema.decodeUnknown(Post))
  )
  yield* logResult("Post title", getResponse.title)

  yield* logDemo("POST Request", "Creating a new post")
  const newPost = {
    userId: 1,
    title: "Demo Post",
    body: "This is a demo post from @effect/platform"
  }
  const postResponse = yield* HttpClientRequest.post("https://jsonplaceholder.typicode.com/posts").pipe(
    HttpClientRequest.jsonBody(newPost),
    client.execute,
    Effect.flatMap(HttpClientResponse.json),
    Effect.scoped
  )
  yield* logResult("Created post ID", postResponse)

  return { getResponse, postResponse }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const headerManipulation = Effect.gen(function*() {
  yield* logSection("Header Manipulation")

  const client = yield* HttpClient.HttpClient

  yield* logDemo("Custom Headers", "Adding custom headers to request")
  const response = yield* HttpClientRequest.get("https://httpbin.org/headers").pipe(
    HttpClientRequest.setHeader("X-Custom-Header", "Effect Platform Demo"),
    HttpClientRequest.setHeader("User-Agent", "effect-platform-demo/1.0"),
    HttpClientRequest.bearerToken("demo-token-123"),
    client.execute,
    Effect.flatMap(HttpClientResponse.json),
    Effect.scoped
  )
  yield* logResult("Sent headers", response)

  yield* logDemo("Response Headers", "Reading response headers")
  const headResponse = yield* client.head("https://httpbin.org/get").pipe(
    Effect.map((res) => ({
      contentType: Headers.get(res.headers, "content-type"),
      server: Headers.get(res.headers, "server"),
      date: Headers.get(res.headers, "date")
    }))
  )
  yield* logResult("Response headers", headResponse)

  return { customHeaders: response, responseHeaders: headResponse }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const clientConfiguration = Effect.gen(function*() {
  yield* logSection("Client Configuration")

  const baseClient = yield* HttpClient.HttpClient

  yield* logDemo("Base URL Client", "Client with base URL")
  const apiClient = baseClient.pipe(
    HttpClient.mapRequest(
      HttpClientRequest.prependUrl("https://jsonplaceholder.typicode.com")
    )
  )

  const users = yield* apiClient.get("/users").pipe(
    Effect.flatMap(HttpClientResponse.json),
    Effect.flatMap(Schema.decodeUnknown(Schema.Array(User)))
  )
  yield* logResult("Users fetched", `${users.length} users`)

  yield* logDemo("Filtered Client", "Client that only accepts 2xx responses")
  const strictClient = apiClient.pipe(
    HttpClient.filterStatusOk
  )

  const successResult = yield* strictClient.get("/posts/1").pipe(
    Effect.flatMap(HttpClientResponse.json),
    Effect.either
  )
  yield* logResult("2xx response", successResult._tag === "Right")

  yield* logDemo("Retry Client", "Client with automatic retry")
  const retryClient = apiClient.pipe(
    HttpClient.retry({
      times: 3,
      delay: "100 millis"
    })
  )

  const retryResult = yield* retryClient.get("/posts/2").pipe(
    Effect.flatMap(HttpClientResponse.json)
  )
  yield* logResult("Retry successful", retryResult !== null)

  return { users, strictClient, retryClient }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const streamingResponses = Effect.gen(function*() {
  yield* logSection("Streaming Responses")

  const client = yield* HttpClient.HttpClient

  yield* logDemo("Stream Response", "Processing response as stream")
  const streamData = yield* client.get("https://jsonplaceholder.typicode.com/posts").pipe(
    Effect.map((response) => response.stream),
    Stream.unwrapScoped,
    Stream.decodeText(),
    Stream.splitLines,
    Stream.take(5),
    Stream.runCollect
  )
  yield* logResult("First 5 lines", streamData.length)

  yield* logDemo("Chunked Processing", "Processing large response in chunks")
  const chunkCount = yield* client.get("https://jsonplaceholder.typicode.com/comments").pipe(
    Effect.map((response) => response.stream),
    Stream.unwrapScoped,
    Stream.chunks,
    Stream.runCount
  )
  yield* logResult("Chunks processed", chunkCount)

  return { streamData, chunkCount }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const errorHandling = Effect.gen(function*() {
  yield* logSection("HTTP Error Handling")

  const client = yield* HttpClient.HttpClient

  yield* logDemo("404 Error", "Handling not found error")
  const notFoundResult = yield* client.get("https://jsonplaceholder.typicode.com/posts/999999").pipe(
    Effect.flatMap((response) => {
      if (response.status === 404) {
        return Effect.succeed("Resource not found")
      }
      return HttpClientResponse.json(response)
    }),
    Effect.catchTag("ResponseError", () => Effect.succeed("Caught response error"))
  )
  yield* logResult("404 handled", notFoundResult)

  yield* logDemo("Network Error", "Handling connection failure")
  const networkResult = yield* client.get("http://invalid-domain-that-doesnt-exist.com").pipe(
    Effect.catchTag("RequestError", (error) => Effect.succeed(`Network error: ${error.reason}`))
  )
  yield* logResult("Network error handled", networkResult)

  yield* logDemo("Timeout", "Handling request timeout")
  const timeoutResult = yield* client.get("https://httpbin.org/delay/10").pipe(
    Effect.timeout("1 second"),
    Effect.catchTag("TimeoutException", () => Effect.succeed("Request timed out"))
  )
  yield* logResult("Timeout handled", timeoutResult)

  return { notFoundResult, networkResult, timeoutResult }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const schemaValidation = Effect.gen(function*() {
  yield* logSection("Schema Validation")

  const client = yield* HttpClient.HttpClient

  yield* logDemo("Response Validation", "Validating response with schema")
  const validatedPost = yield* client.get("https://jsonplaceholder.typicode.com/posts/1").pipe(
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Post)),
    Effect.scoped
  )
  yield* logResult("Validated post", validatedPost.title)

  yield* logDemo("Request Body Schema", "Sending validated request body")
  const CreatePost = Schema.Struct({
    title: Schema.String,
    body: Schema.String,
    userId: Schema.Number
  })

  const schemaBodyRequest = HttpClientRequest.schemaBodyJson(CreatePost)
  const createResult = yield* schemaBodyRequest(
    HttpClientRequest.post("https://jsonplaceholder.typicode.com/posts"),
    { title: "Schema Demo", body: "Validated body", userId: 1 }
  ).pipe(
    Effect.flatMap(client.execute),
    Effect.flatMap(HttpClientResponse.json),
    Effect.scoped
  )
  yield* logResult("Created with schema", createResult)

  return { validatedPost, createResult }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const interceptors = Effect.gen(function*() {
  yield* logSection("Request/Response Interceptors")

  const baseClient = yield* HttpClient.HttpClient

  yield* logDemo("Request Interceptor", "Modifying all requests")
  const interceptedClient = baseClient.pipe(
    HttpClient.mapRequest((request) => HttpClientRequest.setHeader(request, "X-Intercepted", "true")),
    HttpClient.tapRequest((request) => Console.log("🔍 Request to:", request.url))
  )

  const interceptedResponse = yield* interceptedClient.get("https://httpbin.org/headers").pipe(
    Effect.flatMap(HttpClientResponse.json)
  )
  yield* logResult("Intercepted headers", interceptedResponse)

  yield* logDemo("Response Interceptor", "Processing all responses")
  const loggingClient = baseClient.pipe(
    HttpClient.mapEffect((response) =>
      Console.log(`📥 Response status: ${response.status}`).pipe(
        Effect.as(response)
      )
    )
  )

  yield* loggingClient.get("https://jsonplaceholder.typicode.com/posts/1").pipe(
    Effect.flatMap(HttpClientResponse.json)
  )

  return { interceptedResponse }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function*() {
  yield* withTiming("Basic Requests", basicRequests)
  yield* withTiming("Header Manipulation", headerManipulation)
  yield* withTiming("Client Configuration", clientConfiguration)
  yield* withTiming("Streaming Responses", streamingResponses)
  yield* withTiming("Error Handling", errorHandling)
  yield* withTiming("Schema Validation", schemaValidation)
  yield* withTiming("Interceptors", interceptors)

  yield* Console.log("\n✨ All HttpClient demos completed!")
})
