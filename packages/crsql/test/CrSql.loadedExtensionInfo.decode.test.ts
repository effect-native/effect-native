import { it } from "@effect-native/bun-test"
import * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
import { Effect } from "effect"
import * as Schema from "effect/Schema"
import * as assert from "node:assert"

it.effect("ExtInfoLoaded: decodeUnknown succeeds for valid input", () =>
  Effect.gen(function*() {
    const now = new Date()
    const input = { path: "n/a", loadedAt: now }

    const typed = yield* Schema.decodeUnknownEffect(CrSqlSchema.ExtInfoLoaded)(input)
    // Round-trip to encoded form to validate transformation correctness
    const roundTripped = yield* Schema.encodeEffect(CrSqlSchema.ExtInfoLoaded)(typed)

    assert.strictEqual(roundTripped.path, "n/a")
    assert.ok(roundTripped.loadedAt instanceof Date)
    assert.strictEqual(roundTripped.loadedAt.getTime(), now.getTime())
  }))

it.effect("ExtInfoLoaded: decodeUnknown rejects invalid input", () =>
  Effect.gen(function*() {
    const bad1 = { path: 123, loadedAt: new Date() } as unknown
    const bad2 = { path: "ok", loadedAt: "2024-01-01T00:00:00Z" } as unknown

    const result1 = yield* Schema.decodeUnknownEffect(CrSqlSchema.ExtInfoLoaded)(bad1).pipe(Effect.result)
    assert.strictEqual(result1._tag, "Failure")

    const result2 = yield* Schema.decodeUnknownEffect(CrSqlSchema.ExtInfoLoaded)(bad2).pipe(Effect.result)
    assert.strictEqual(result2._tag, "Failure")
  }))
