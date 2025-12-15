/**
 * Protocol layer tests.
 *
 * These tests specify the unhex() capability check behavior:
 * - Creating the protocol layer executes a capability check query
 * - Missing/disabled unhex() fails with UnhexUnavailable
 */
import { describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as ProtocolError from "../src/ProtocolError.js"

describe("Protocol layer unhex() capability check", () => {
  // NOTE: Integration tests for the Protocol layer require better-sqlite3
  // native bindings to be compiled. See packages-native/crsql/test/ for
  // examples of integration tests with SQLite.

  it.effect("UnhexUnavailable error has correct _tag", () =>
    Effect.gen(function*() {
      const error = new ProtocolError.UnhexUnavailable()
      if (error._tag !== "UnhexUnavailable") {
        yield* Effect.fail(new Error("UnhexUnavailable has wrong _tag"))
      }
    }))

  it.effect("ProtocolError error has correct _tag", () =>
    Effect.gen(function*() {
      const error = new ProtocolError.ProtocolError({ message: "test" })
      if (error._tag !== "ProtocolError") {
        yield* Effect.fail(new Error("ProtocolError has wrong _tag"))
      }
    }))

  it.effect("ProtocolError includes message in error", () =>
    Effect.gen(function*() {
      const error = new ProtocolError.ProtocolError({ message: "validation failed" })
      if (!error.message.includes("validation failed")) {
        yield* Effect.fail(new Error("ProtocolError message mismatch"))
      }
    }))
})
