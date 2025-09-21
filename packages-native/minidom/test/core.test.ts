import { describe, expect, it } from "@effect/vitest"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"

import { Handle, MiniDomError } from "@effect-native/minidom"

describe("MiniDom Handle", () => {
  it("marks handles with hidden type id", () => {
    const handle = Handle.make({ id: 1 })
    expect(Handle.is(handle)).toBe(true)
    expect(Handle.is({ id: 1 })).toBe(false)
  })

  it("supports custom equality via capability", () => {
    const capability = Handle.capability({
      equals: (a, b) => a.value === b.value,
      serialize: (handle) => handle.value,
      deserialize: (value) => Handle.make(value as string)
    })

    const a = Handle.make("x")
    const b = Handle.make("x")
    const c = Handle.make("y")

    expect(capability.equals(a, b)).toBe(true)
    expect(capability.equals(a, c)).toBe(false)
    expect(capability.serialize?.(a)).toBe("x")
    expect(Handle.is(capability.deserialize?.("x"))).toBe(true)
  })
})

describe("MiniDomError", () => {
  it("creates schema violation errors", () => {
    const error = new MiniDomError.SchemaViolation({
      message: "invalid node",
      issues: ["missing child"],
      cause: new Error("details")
    })
    expect(error).toBeInstanceOf(Error)
    expect(error._tag).toBe("SchemaViolation")
    expect(error.reason).toBe("schema-violation")
    expect(error.issues).toEqual(["missing child"])
  })

  it.effect("wraps backend failures", () =>
    Effect.gen(function*() {
      const cause = new Error("db down")
      const error = new MiniDomError.BackendFailure({
        message: "storage failure",
        cause
      })
      expect(Data.struct({ cause: error.cause })).toStrictEqual({ cause })
      expect(error.reason).toBe("backend-failure")
    }))
})
