/**
 * Tests for the Node.js runtime adapter.
 *
 * @since 0.1.0
 */
import { describe, it } from "@effect/vitest"
import { Cause, Chunk, Effect, Exit, Layer } from "effect"
import * as NodeRuntime from "../src/NodeRuntime.js"
import * as NodeRuntimeError from "../src/NodeRuntimeError.js"

describe("NodeRuntimeLive", () => {
  describe("exports", () => {
    it.effect("exists as a layer constructor", () =>
      Effect.gen(function*() {
        // NodeRuntimeLive is a function that takes config and returns a Layer
        const layer = NodeRuntime.NodeRuntimeLive({
          databasePath: "/tmp/test.db",
          shutdownTimeout: "5 seconds"
        })
        // Verify it's a Layer
        yield* Effect.sync(() => {
          if (!Layer.isLayer(layer)) {
            throw new Error("NodeRuntimeLive did not return a Layer")
          }
        })
      })
    )
  })

  describe("configuration validation", () => {
    it.effect("fails with DatabasePathInvalid when databasePath is empty", () =>
      Effect.gen(function*() {
        const layer = NodeRuntime.NodeRuntimeLive({
          databasePath: "",
          shutdownTimeout: "5 seconds"
        })

        const exit = yield* Effect.exit(
          Effect.scoped(Layer.build(layer))
        )

        yield* Effect.sync(() => {
          if (!Exit.isFailure(exit)) {
            throw new Error("Expected layer build to fail with empty path")
          }
          const failures = Chunk.toArray(Cause.failures(exit.cause))
          if (failures.length === 0) {
            throw new Error("Expected at least one failure in cause")
          }
          const error = failures[0] as { _tag: string }
          if (error._tag !== "DatabasePathInvalid") {
            throw new Error(`Expected DatabasePathInvalid, got ${error._tag}`)
          }
        })
      })
    )

    it.effect("fails with DatabasePathInvalid when databasePath contains null bytes", () =>
      Effect.gen(function*() {
        const layer = NodeRuntime.NodeRuntimeLive({
          databasePath: "/non\x00existent/path/to/db.sqlite",
          shutdownTimeout: "5 seconds"
        })

        const exit = yield* Effect.exit(
          Effect.scoped(Layer.build(layer))
        )

        yield* Effect.sync(() => {
          if (!Exit.isFailure(exit)) {
            throw new Error("Expected layer build to fail with null byte in path")
          }
          const failures = Chunk.toArray(Cause.failures(exit.cause))
          if (failures.length === 0) {
            throw new Error("Expected at least one failure in cause")
          }
          const error = failures[0] as { _tag: string }
          if (error._tag !== "DatabasePathInvalid") {
            throw new Error(`Expected DatabasePathInvalid, got ${error._tag}`)
          }
        })
      })
    )
  })
})

describe("NodeRuntimeError", () => {
  it.effect("DatabasePathInvalid error type exists and is constructible", () =>
    Effect.gen(function*() {
      const error = new NodeRuntimeError.DatabasePathInvalid({
        path: "/invalid/path",
        reason: "path is not accessible"
      })
      yield* Effect.sync(() => {
        if (error._tag !== "DatabasePathInvalid") {
          throw new Error("DatabasePathInvalid has wrong _tag")
        }
        if (error.path !== "/invalid/path") {
          throw new Error("DatabasePathInvalid has wrong path")
        }
        if (error.reason !== "path is not accessible") {
          throw new Error("DatabasePathInvalid has wrong reason")
        }
      })
    })
  )

  it.effect("ShutdownTimeout error type exists and is constructible", () =>
    Effect.gen(function*() {
      const error = new NodeRuntimeError.ShutdownTimeout({
        timeout: "5 seconds"
      })
      yield* Effect.sync(() => {
        if (error._tag !== "ShutdownTimeout") {
          throw new Error("ShutdownTimeout has wrong _tag")
        }
        if (error.timeout !== "5 seconds") {
          throw new Error("ShutdownTimeout has wrong timeout")
        }
      })
    })
  )
})
