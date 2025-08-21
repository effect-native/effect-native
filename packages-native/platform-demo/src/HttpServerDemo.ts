/**
 * @since 0.0.1
 */
import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServer from "@effect/platform/HttpServer"
import * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { logDemo, logResult, logSection } from "./utils/DemoHelpers.js"

/**
 * @since 0.0.1
 * @category schemas
 */
const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})
type Todo = typeof Todo.Type

/**
 * @since 0.0.1
 * @category demos
 * @example
 * ```ts
 * import * as HttpServerDemo from "@effect-native/platform-demo/HttpServerDemo"
 * import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 * import { createServer } from "node:http"
 *
 * const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3000 })
 *
 * Effect.provide(
 *   HttpServerDemo.basicRouting,
 *   ServerLive
 * ).pipe(Layer.launch, Effect.runPromise)
 * ```
 */
export const basicRouting = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("Welcome to Effect Platform Demo!")),
  HttpRouter.get(
    "/hello/:name",
    Effect.gen(function*() {
      const params = yield* HttpRouter.params
      return HttpServerResponse.json({ message: `Hello, ${params.name}!` })
    })
  ),
  HttpRouter.post(
    "/echo",
    HttpServerRequest.schemaBodyJson(Schema.Unknown).pipe(
      Effect.flatMap((body) => HttpServerResponse.json({ echo: body }))
    )
  ),
  HttpRouter.get("/status", HttpServerResponse.empty({ status: 204 }))
)

/**
 * @since 0.0.1
 * @category demos
 */
export const middlewareDemo = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/protected",
    Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      const authHeader = request.headers["authorization"]
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7)
        if (token === "secret-token") {
          return HttpServerResponse.json({ message: "Protected resource accessed" })
        }
      }
      return HttpServerResponse.text("Unauthorized", { status: 401 })
    })
  ),
  HttpRouter.get("/logged", HttpServerResponse.text("This request was logged")),
  HttpRouter.get(
    "/cors",
    HttpServerResponse.json({ cors: "enabled" }, {
      headers: {
        "Access-Control-Allow-Origin": "https://example.com",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Credentials": "true"
      }
    })
  )
)

/**
 * @since 0.0.1
 * @category demos
 */
export const streamingDemo = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/stream/numbers",
    HttpServerResponse.stream(
      Stream.range(1, 10).pipe(
        Stream.map((n) => `Number: ${n}\n`),
        Stream.encodeText,
        Stream.intersperse(Stream.make("\n").pipe(Stream.encodeText)),
        Stream.flatten,
        Stream.schedule(Schedule.spaced("500 millis"))
      )
    )
  ),
  HttpRouter.get(
    "/stream/events",
    HttpServerResponse.stream(
      Stream.range(1, 5).pipe(
        Stream.map((n) => ({
          event: "message",
          data: { count: n, timestamp: new Date().toISOString() }
        })),
        Stream.map((event) => `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`),
        Stream.encodeText,
        Stream.schedule(Schedule.spaced("1 second"))
      ),
      { contentType: "text/event-stream" }
    )
  )
)

/**
 * @since 0.0.1
 * @category demos
 */
export const errorHandlingDemo = HttpRouter.empty.pipe(
  HttpRouter.get("/error/not-found", HttpServerResponse.empty({ status: 404 })),
  HttpRouter.get("/error/bad-request", HttpServerResponse.text("Invalid request parameters", { status: 400 })),
  HttpRouter.get("/error/internal", HttpServerResponse.text("Something went wrong", { status: 500 })),
  HttpRouter.get("/error/custom", HttpServerResponse.text("I'm a teapot", { status: 418 })),
  HttpRouter.get(
    "/error/handled",
    Effect.fail(new Error("Unhandled error")).pipe(
      Effect.catchAll((error) =>
        HttpServerResponse.json({
          error: "handled",
          message: String(error)
        }, { status: 500 })
      )
    )
  )
)

/**
 * @since 0.0.1
 * @category demos
 */
export const fileUploadDemo = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/upload/json",
    HttpServerRequest.schemaBodyJson(Todo).pipe(
      Effect.flatMap((todo) =>
        HttpServerResponse.json({
          received: todo,
          processed: true
        })
      )
    )
  ),
  HttpRouter.post(
    "/upload/form",
    HttpServerRequest.schemaBodyForm(
      Schema.Struct({
        name: Schema.String,
        age: Schema.NumberFromString
      })
    ).pipe(
      Effect.flatMap((data) =>
        HttpServerResponse.json({
          message: `Received form data for ${data.name}, age ${data.age}`
        })
      )
    )
  ),
  HttpRouter.post(
    "/upload/multipart",
    Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      const parts = yield* request.multipart
      return HttpServerResponse.json({
        parts: parts.map((part) => ({
          name: part.name,
          filename: part.filename,
          contentType: part.contentType
        }))
      })
    })
  )
)

/**
 * @since 0.0.1
 * @category demos
 */
export const routerComposition = HttpRouter.empty.pipe(
  HttpRouter.mount(
    "/api/v1",
    HttpRouter.empty.pipe(
      HttpRouter.get(
        "/users",
        HttpServerResponse.json([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" }
        ])
      ),
      HttpRouter.get(
        "/users/:id",
        Effect.gen(function*() {
          const params = yield* HttpRouter.params
          const id = Number(params.id)
          return HttpServerResponse.json({ id, name: `User ${id}` })
        })
      )
    )
  ),
  HttpRouter.mount(
    "/health",
    HttpRouter.empty.pipe(
      HttpRouter.get("/", HttpServerResponse.json({ status: "healthy" })),
      HttpRouter.get("/ready", HttpServerResponse.json({ ready: true })),
      HttpRouter.get("/live", HttpServerResponse.json({ live: true }))
    )
  )
)

/**
 * @since 0.0.1
 * @category demos
 */
export const cookiesAndHeaders = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/cookies/set",
    Effect.map(
      HttpServerResponse.json({ message: "Cookie set" }),
      HttpServerResponse.setCookie("demo", "value", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 3600
      })
    )
  ),
  HttpRouter.get(
    "/cookies/read",
    Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      const cookies = request.cookies
      return HttpServerResponse.json({ cookies })
    })
  ),
  HttpRouter.get(
    "/headers/custom",
    Effect.map(
      HttpServerResponse.json({ message: "Custom headers" }),
      (response) =>
        response.pipe(
          HttpServerResponse.setHeader("X-Custom-Header", "Effect Platform"),
          HttpServerResponse.setHeader("X-Demo-Version", "1.0.0")
        )
    )
  ),
  HttpRouter.get(
    "/headers/read",
    Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      const headers = request.headers
      return HttpServerResponse.json({
        userAgent: headers["user-agent"],
        accept: headers["accept"],
        custom: headers["x-custom-header"]
      })
    })
  )
)

/**
 * @since 0.0.1
 * @category demos
 */
export const websocketUpgrade = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/ws",
    Effect.gen(function*() {
      yield* logDemo("WebSocket", "Upgrade request received")
      return HttpServerResponse.json({
        message: "WebSocket endpoint - upgrade required",
        hint: "Use a WebSocket client to connect"
      })
    })
  )
)

/**
 * @since 0.0.1
 * @category demos
 */
export const createDemoApp = Effect.gen(function*() {
  yield* logSection("HTTP Server Demo App")

  const app = HttpRouter.empty.pipe(
    HttpRouter.mount("/", basicRouting),
    HttpRouter.mount("/middleware", middlewareDemo),
    HttpRouter.mount("/streaming", streamingDemo),
    HttpRouter.mount("/errors", errorHandlingDemo),
    HttpRouter.mount("/files", fileUploadDemo),
    HttpRouter.mount("/router", routerComposition),
    HttpRouter.mount("/cookies", cookiesAndHeaders),
    HttpRouter.mount("/websocket", websocketUpgrade)
  )

  yield* logResult("Routes configured", [
    "GET /",
    "GET /hello/:name",
    "POST /echo",
    "GET /middleware/protected",
    "GET /streaming/numbers",
    "GET /errors/not-found",
    "POST /files/upload/json",
    "GET /router/api/v1/users",
    "GET /cookies/set",
    "GET /websocket/ws"
  ])

  return HttpServer.serve(app).pipe(
    HttpServer.withLogAddress
  )
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function*() {
  yield* Console.log("\n✨ HTTP Server demos are ready to be served!")
  yield* Console.log("Mount these routers with your platform-specific HTTP server implementation")
})
