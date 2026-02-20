import { expect, it, vi } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"

it.effect("maps thrown error to PlatformNotSupportedError with friendly help", () =>
  Effect.gen(function*() {
    vi.resetModules()
    vi.doMock("../src/index", () => ({
      getLibSqlitePathSync: () => {
        throw new Error("Linux musl detected; v1 supports glibc only.")
      }
    }))
    const { getLibSqlitePath } = yield* Effect.promise(() => import("../src/effect"))
    const exit = yield* Effect.exit(getLibSqlitePath)
    if (exit._tag !== "Failure") {
      throw new Error("expected failure")
    }
    // In v4 Effect, Cause is an object with a `reasons` array of Reason values.
    // Each Reason has _tag "Fail" | "Die" | "Interrupt". The cause itself has no _tag.
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
