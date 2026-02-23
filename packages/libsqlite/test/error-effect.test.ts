import { afterEach, expect, it, jest } from "@effect-native/bun-test"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { PlatformNotSupportedError } from "../src/effect.js"
import * as indexModule from "../src/index.js"

afterEach(() => {
  jest.restoreAllMocks()
})

it.effect("maps thrown error to PlatformNotSupportedError with friendly help", (): Effect.Effect<void> =>
  Effect.gen(function*() {
    jest.spyOn(indexModule, "getLibSqlitePathSync").mockImplementation(() => {
      throw new Error("Linux musl detected; v1 supports glibc only.")
    })
    const { getLibSqlitePath } = yield* Effect.promise(() => import("../src/effect.js"))
    const exit = yield* Effect.exit(getLibSqlitePath)
    if (exit._tag !== "Failure") {
      throw new Error("expected failure")
    }
    const failReasons = exit.cause.reasons.filter(Cause.isFailReason)
    expect(failReasons.length).toBe(1)
    const failReason = failReasons[0]
    expect(failReason._tag).toBe("Fail")
    const err = failReason.error
    expect(err).toBeInstanceOf(PlatformNotSupportedError)
    expect(err.help.includes("If you'd like support")).toBe(true)
  }))
