import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

import * as KvMiniDom from "@effect-native/minidom/adapters/KvMiniDom"
import * as SqlMiniDom from "@effect-native/minidom/adapters/SqlMiniDom"

describe("Adapter stubs (FR1.13 / H9)", () => {
  it("exposes capability metadata for SQL adapter", () => {
    expect(SqlMiniDom.metadata.id).toBe("SqlMiniDom")
    expect(SqlMiniDom.metadata.capabilities.transaction.status).toBe("planned")
  })

  it.effect("fails fast when invoking unimplemented SQL adapter", () =>
    Effect.gen(function*() {
      const failure = yield* SqlMiniDom.make().pipe(Effect.either)
      expect(failure._tag).toBe("Left")
    }))

  it("exposes capability metadata for KV adapter", () => {
    expect(KvMiniDom.metadata.id).toBe("KvMiniDom")
    expect(KvMiniDom.metadata.capabilities.events.status).toBe("planned")
  })

  it.effect("fails fast when invoking unimplemented KV adapter", () =>
    Effect.gen(function*() {
      const failure = yield* KvMiniDom.make().pipe(Effect.either)
      expect(failure._tag).toBe("Left")
    }))
})
