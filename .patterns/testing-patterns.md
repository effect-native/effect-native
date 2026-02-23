# Testing Patterns - Effect Native (`v4`)

## Overview

`v4` uses `@effect-native/bun-test` as the single normative testing runner.

Use these rules for all package tests in this repository.

## Required Conventions

- Import test primitives from `@effect-native/bun-test`.
- Use `it.effect` for Effectful tests and `it.scoped` when resources need scoped cleanup.
- Use `expect(...)` assertions.
- Keep test names as descriptions of observed behavior (avoid "should").
- Use `TestClock` for time-dependent behavior.

## Bun-Test Entry Points

```ts
import { describe, expect, it, test } from "@effect-native/bun-test"
```

- `it.effect`: runs with Effect TestServices (including `TestClock`)
- `it.scoped`: same as `it.effect` with scoped finalization support
- `it.live`: runs against live services and wall-clock time
- `test` / `it`: fine for pure, non-Effect helpers

## Effect Test Pattern

```ts
import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"

describe("Counter", () => {
  it.effect("increments and returns the next value", () =>
    Effect.gen(function*() {
      const next = yield* Counter.increment
      expect(next).toBe(1)
    }))
})
```

## Scoped Resource Pattern

```ts
import { describe, expect, it } from "@effect-native/bun-test"
import { Effect, Ref } from "effect"

describe("resource lifecycle", () => {
  it.scoped("acquires and releases the resource", () =>
    Effect.gen(function*() {
      const released = yield* Ref.make(false)

      const value = yield* Effect.acquireRelease(
        Effect.succeed("resource"),
        () => Ref.set(released, true)
      )

      expect(value).toBe("resource")
      expect(yield* Ref.get(released)).toBe(true)
    }))
})
```

## Time Pattern (`TestClock`)

```ts
import { describe, expect, it } from "@effect-native/bun-test"
import { Duration, Effect, TestClock } from "effect"

describe("timeouts", () => {
  it.effect("completes after virtual time advances", () =>
    Effect.gen(function*() {
      const fiber = yield* Effect.fork(
        Effect.sleep(Duration.seconds(5)).pipe(Effect.as("done"))
      )

      yield* TestClock.adjust(Duration.seconds(5))

      const value = yield* fiber.join
      expect(value).toBe("done")
    }))
})
```

## Layer Pattern

```ts
import { describe, expect, layer } from "@effect-native/bun-test"
import { Effect } from "effect"

layer(DatabaseLive)("Database", (it) => {
  it.effect("runs queries against shared setup", () =>
    Effect.gen(function*() {
      const db = yield* Database
      const rows = yield* db.query("SELECT 1 AS value")
      expect(rows[0]?.value).toBe(1)
    }))
})
```

## Forbidden Patterns

```ts
// Do not run effects manually inside test bodies.
// Wrong:
test("manual runtime", () => {
  const value = Effect.runSync(myEffect)
  expect(value).toBe(1)
})

// Correct:
it.effect("runtime managed by bun-test", () =>
  Effect.gen(function*() {
    const value = yield* myEffect
    expect(value).toBe(1)
  }))
```

- Do not import Effect tests from `bun:test`.
- Do not use `Effect.runSync` / `Effect.runPromise` in Effect-based tests.
- Do not use wall-clock sleeps when `TestClock` can model time.

## Validation Commands

```bash
bun --filter @effect-native/<package> test
bun run test
```

Use targeted package tests while iterating, then run `bun run test` before finishing.
