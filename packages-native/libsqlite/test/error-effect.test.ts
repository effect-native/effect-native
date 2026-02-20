import { afterEach, expect, it, jest } from "@effect-native/bun-test"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as indexModule from "../src/index"

afterEach(() => {
  jest.restoreAllMocks()
})

it.effect("maps thrown error to PlatformNotSupportedError with friendly help", () =>
  Effect.gen(function*() {
    jest.spyOn(indexModule, "getLibSqlitePathSync").mockImplementation(() => {
      throw new Error("Linux musl detected; v1 supports glibc only.")
    })
    const { getLibSqlitePath } = yield* Effect.promise(() => import("../src/effect"))
    const exit = yield* Effect.exit(getLibSqlitePath)
    if (exit._tag !== "Failure") {
      throw new Error("expected failure")
    }
    const failReasons = exit.cause.reasons.filter(Cause.isFailReason)
    expect(failReasons.length).toBe(1)
    const failReason = failReasons[0]
    expect(failReason._tag).toBe("Fail")
    const maybeError = failReason.error
    if (typeof maybeError !== "object" || maybeError === null || !("_tag" in maybeError)) {
      throw new Error("unexpected error shape")
    }
    const err = maybeError as { _tag: string; help?: unknown }
    expect(err._tag).toBe("PlatformNotSupportedError")
    expect(typeof err.help === "string" && (err.help as string).includes("If you'd like support")).toBe(true)
  }))
