# Testing Patterns - Effect Library

## 🎯 OVERVIEW

Comprehensive testing strategies for the Effect library using either:

- **`@effect-native/bun-test`** - For Bun's test runner
- **`@effect/vitest`** - For Vitest

Both provide the same core capabilities:

- TestServices automatically (TestClock, TestAnnotations, etc.)
- Deterministic time control
- Automatic resource cleanup with scoped tests
- Layer composition for sharing expensive setup

## 🚨 CRITICAL TESTING REQUIREMENTS

### Testing Framework Selection

Choose based on your test runner:

| Test Runner | Effect Testing Package    | Assertion Style |
| ----------- | ------------------------- | --------------- |
| Bun         | `@effect-native/bun-test` | `expect()`      |
| Vitest      | `@effect/vitest`          | `assert.*()`    |

#### ✅ Use @effect-native/bun-test for Bun

```typescript
import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"

// Use it.effect for Effect-based tests
it.effect("works with Effects", () =>
  Effect.gen(function*() {
    const result = yield* someEffect
    expect(result).toBe(expectedValue)
  }))

// With scoped resources (automatic cleanup)
it.scoped("handles resources", () =>
  Effect.gen(function*() {
    const resource = yield* Effect.acquireRelease(
      Effect.succeed("resource"),
      () => Effect.void
    )
    expect(resource).toBe("resource")
  }))

// Live tests (no TestServices, real time)
it.live("integration test", () =>
  Effect.gen(function*() {
    const result = yield* someRealWorldEffect
    expect(result).toBeDefined()
  }))

// Layer-based tests (shared setup)
import { layer } from "@effect-native/bun-test"

layer(DatabaseLive)("with database", (it) => {
  it.effect("queries work", () =>
    Effect.gen(function*() {
      const db = yield* Database
      const result = yield* db.query("SELECT 1")
      expect(result).toBeDefined()
    }))
})
```

#### ✅ Use @effect/vitest for Vitest

```typescript
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

// Use it.effect for Effect-based tests
it.effect("works with Effects", () =>
  Effect.gen(function*() {
    const result = yield* someEffect
    assert.strictEqual(result, expectedValue)
  }))

// With scoped resources
it.scoped("handles resources", () =>
  Effect.gen(function*() {
    const resource = yield* Effect.acquireRelease(
      Effect.succeed("resource"),
      () => Effect.void
    )
    assert.strictEqual(resource, "resource")
  }))

// Live tests
it.live("integration test", () =>
  Effect.gen(function*() {
    const result = yield* someRealWorldEffect
    assert.isDefined(result)
  }))

// Layer-based tests
it.layer(DatabaseLive)("with database", (it) => {
  it.effect("queries work", () =>
    Effect.gen(function*() {
      const db = yield* Database
      const result = yield* db.query("SELECT 1")
      assert.isDefined(result)
    }))
})
```

#### ✅ Use regular test runner for pure TypeScript functions

```typescript
// Bun
import { describe, expect, test } from "@effect-native/bun-test"

// Vitest
import { describe, expect, it } from "vitest"

// For pure functions that don't return Effects
test("works with pure functions", () => {
  const result = pureFunction(input)
  expect(result).toBe(expectedValue)
})
```

### ❌ FORBIDDEN PATTERNS

#### Never use Effect.runSync/runPromise in tests

```typescript
// ❌ WRONG - Don't manually run Effects
import { describe, expect, test } from "bun:test" // or "vitest"

test("wrong pattern", () => {
  const result = Effect.runSync(
    Effect.gen(function*() {
      return yield* someEffect
    })
  )
  expect(result).toBe(value)
})

// ✅ CORRECT - Use it.effect instead
import { describe, expect, it } from "@effect-native/bun-test"

it.effect("correct pattern", () =>
  Effect.gen(function*() {
    const result = yield* someEffect
    expect(result).toBe(value)
  }))
```

#### Never import from bun:test or vitest directly for Effect tests

```typescript
// ❌ WRONG - Direct import loses TestServices
import { describe, expect, test } from "bun:test"

test("no TestClock available", async () => {
  await Effect.runPromise(
    Effect.gen(function*() {
      // TestClock.adjust won't work here!
      yield* Effect.sleep("1 second")
    })
  )
})

// ✅ CORRECT - Use the Effect testing package
import { describe, expect, it } from "@effect-native/bun-test"

it.effect("TestClock available", () =>
  Effect.gen(function*() {
    const fiber = yield* Effect.fork(Effect.sleep("1 hour"))
    yield* TestClock.adjust("1 hour")
    yield* fiber.join
  }))
```

## 🕐 TIME-DEPENDENT TESTING WITH TESTCLOCK

### ⚠️ CRITICAL: Always use TestClock for time-dependent operations

Any code that involves timing must use TestClock to avoid flaky tests. TestClock is automatically provided by `it.effect()` and `it.scoped()`.

```typescript
// Bun
import { describe, expect, it } from "@effect-native/bun-test"
// Or Vitest
// import { assert, describe, it } from "@effect/vitest"

import { Duration, Effect, TestClock } from "effect"

describe("time-dependent operations", () => {
  it.effect("handles delays with TestClock", () =>
    Effect.gen(function*() {
      // Start operation that takes 5 seconds
      const fiber = yield* Effect.fork(
        Effect.gen(function*() {
          yield* Effect.sleep(Duration.seconds(5))
          return "completed"
        })
      )

      // Use TestClock to advance time instead of waiting
      yield* TestClock.adjust(Duration.seconds(5))

      const result = yield* fiber.join
      expect(result).toBe("completed")
    }))

  it.effect("tests timeout behavior", () =>
    Effect.gen(function*() {
      const timeoutEffect = Effect.timeout(
        Effect.sleep(Duration.seconds(10)),
        Duration.seconds(5)
      )

      const fiber = yield* Effect.fork(timeoutEffect)

      // Advance time to trigger timeout
      yield* TestClock.adjust(Duration.seconds(5))

      const result = yield* Effect.exit(fiber.join)
      expect(result._tag).toBe("Failure")
    }))
})
```

### Operations requiring TestClock:

- `Effect.sleep()` and `Effect.delay()`
- `Effect.timeout()` and `Effect.race()` with timeouts
- Scheduled operations and retry logic
- Queue operations with time-based completion
- Any concurrent operations dependent on timing

## 🧪 COMPREHENSIVE TESTING PATTERNS

### Basic Effect Testing Pattern

```typescript
// Choose your framework:
import { describe, expect, it } from "@effect-native/bun-test"
// import { assert, describe, it } from "@effect/vitest"

import { Effect } from "effect"
import * as MyModule from "../src/MyModule.js"

describe("MyModule", () => {
  describe("constructors", () => {
    it.effect("create initializes with default values", () =>
      Effect.gen(function*() {
        const instance = yield* MyModule.create()

        expect(MyModule.isInstance(instance)).toBe(true)
        expect(MyModule.getValue(instance)).toBe(0)
      }))

    it.effect("create accepts custom configuration", () =>
      Effect.gen(function*() {
        const config = { initialValue: 42 }
        const instance = yield* MyModule.create(config)

        expect(MyModule.getValue(instance)).toBe(42)
      }))
  })

  describe("combinators", () => {
    it.effect("map transforms values", () =>
      Effect.gen(function*() {
        const instance = yield* MyModule.create({ initialValue: 10 })
        const transformed = yield* MyModule.map(instance, (x) => x * 2)

        expect(MyModule.getValue(transformed)).toBe(20)
      }))
  })
})
```

### Error Handling Testing Pattern

```typescript
// Choose your framework:
import { describe, expect, it } from "@effect-native/bun-test"
// import { assert, describe, it } from "@effect/vitest"

import { Effect, Exit, Layer } from "effect"
import * as MyModule from "../src/MyModule.js"

describe("error handling", () => {
  it.effect("fails with validation error for negative values", () =>
    Effect.gen(function*() {
      const result = yield* Effect.exit(MyModule.create({ initialValue: -1 }))

      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure") {
        expect(MyModule.isValidationError(result.cause)).toBe(true)
      }
    }))

  it.effect("handles network errors gracefully", () =>
    Effect.gen(function*() {
      const mockNetworkFailure = Effect.fail(
        new MyModule.NetworkError({
          message: "Connection timeout"
        })
      )

      const result = yield* Effect.exit(
        MyModule.fetchWithRetry("https://api.example.com").pipe(
          Effect.provide(
            Layer.succeed(NetworkService, {
              fetch: () => mockNetworkFailure
            })
          )
        )
      )

      expect(Exit.isFailure(result)).toBe(true)
    }))
})
```

### Resource Management Testing Pattern

```typescript
// Choose your framework:
import { describe, expect, it } from "@effect-native/bun-test"
// import { assert, describe, it } from "@effect/vitest"

import { Effect, Exit, Ref } from "effect"
import * as ResourceModule from "../src/ResourceModule.js"

describe("resource management", () => {
  it.effect("properly acquires and releases resources", () =>
    Effect.gen(function*() {
      const acquired = yield* Ref.make(false)
      const released = yield* Ref.make(false)

      const mockResource = {
        acquire: Effect.sync(() => Ref.set(acquired, true)),
        use: (resource: unknown) => Effect.succeed("used"),
        release: Effect.sync(() => Ref.set(released, true))
      }

      const result = yield* ResourceModule.withResource(
        mockResource.acquire,
        mockResource.use,
        mockResource.release
      )

      expect(result).toBe("used")
      expect(yield* Ref.get(acquired)).toBe(true)
      expect(yield* Ref.get(released)).toBe(true)
    }))

  it.effect("releases resources even on failure", () =>
    Effect.gen(function*() {
      const released = yield* Ref.make(false)

      const result = yield* Effect.exit(
        ResourceModule.withResource(
          Effect.succeed("resource"),
          () => Effect.fail("operation failed"),
          () => Ref.set(released, true)
        )
      )

      expect(Exit.isFailure(result)).toBe(true)
      expect(yield* Ref.get(released)).toBe(true)
    }))
})
```

### Concurrent Operations Testing Pattern

```typescript
// Choose your framework:
import { describe, expect, it } from "@effect-native/bun-test"
// import { assert, describe, it } from "@effect/vitest"

import { Duration, Effect, Fiber, Ref, TestClock } from "effect"
import * as ConcurrentModule from "../src/ConcurrentModule.js"

describe("concurrent operations", () => {
  it.effect("handles multiple concurrent operations", () =>
    Effect.gen(function*() {
      const operations = [
        ConcurrentModule.operation("A"),
        ConcurrentModule.operation("B"),
        ConcurrentModule.operation("C")
      ]

      const results = yield* Effect.all(operations, {
        concurrency: "unbounded"
      })

      expect(results.length).toBe(3)
      expect(results).toContain("A")
      expect(results).toContain("B")
      expect(results).toContain("C")
    }))

  it.effect("respects concurrency limits", () =>
    Effect.gen(function*() {
      const startTimes = yield* Ref.make<string[]>([])

      const timedOperation = (id: string) =>
        Effect.gen(function*() {
          yield* Ref.update(startTimes, (arr) => [...arr, id])
          yield* Effect.sleep(Duration.seconds(1))
          return id
        })

      const operations = ["A", "B", "C", "D"].map(timedOperation)

      const fiber = yield* Effect.fork(
        Effect.all(operations, { concurrency: 2 })
      )

      // Advance time and check concurrent execution
      yield* TestClock.adjust(Duration.millis(500))
      const midResults = yield* Ref.get(startTimes)
      expect(midResults.length).toBe(2) // Only 2 should start

      yield* TestClock.adjust(Duration.seconds(1))
      const finalResults = yield* fiber.join
      expect(finalResults.length).toBe(4)
    }))
})
```

### Layer and Service Testing Pattern

```typescript
// Choose your framework:
import { describe, expect, it, layer } from "@effect-native/bun-test"
// import { assert, describe, it } from "@effect/vitest"

import { Context, Effect, Exit, Layer } from "effect"
import * as ServiceModule from "../src/ServiceModule.js"

// Test service interfaces
class TestDatabaseService extends Context.Tag("TestDatabaseService")<
  TestDatabaseService,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[], never, never>
  }
>() {}

describe("service integration", () => {
  it.effect("works with mock services", () =>
    Effect.gen(function*() {
      const mockData = [{ id: 1, name: "test" }]

      const result = yield* ServiceModule.findUser("1").pipe(
        Effect.provide(
          Layer.succeed(TestDatabaseService, {
            query: (sql) => Effect.succeed(mockData)
          })
        )
      )

      expect(result).toEqual(mockData[0])
    }))

  it.effect("handles service failures", () =>
    Effect.gen(function*() {
      const result = yield* Effect.exit(
        ServiceModule.findUser("1").pipe(
          Effect.provide(
            Layer.succeed(TestDatabaseService, {
              query: () => Effect.fail("Database connection failed")
            })
          )
        )
      )

      expect(Exit.isFailure(result)).toBe(true)
    }))
})

// Using layer() for shared setup (Bun)
layer(TestDatabaseService.Live)("with database layer", (it) => {
  it.effect("queries work with shared layer", () =>
    Effect.gen(function*() {
      const db = yield* TestDatabaseService
      const result = yield* db.query("SELECT 1")
      expect(result).toBeDefined()
    }))
})
```

## 🎯 ASSERTION PATTERNS

### Bun (@effect-native/bun-test) - use expect()

```typescript
import { describe, expect, it } from "@effect-native/bun-test"

it.effect("assertions with expect", () =>
  Effect.gen(function*() {
    const result = yield* someEffect

    expect(result).toBe(expected)
    expect(result).toEqual(expectedObject)
    expect(condition).toBe(true)
    expect(Exit.isSuccess(result)).toBe(true)
    expect(Exit.isFailure(result)).toBe(true)
  }))
```

### Vitest (@effect/vitest) - use assert.\*

```typescript
import { assert, describe, it } from "@effect/vitest"

it.effect("assertions with assert", () =>
  Effect.gen(function*() {
    const result = yield* someEffect

    assert.strictEqual(actual, expected)
    assert.deepStrictEqual(actualObject, expectedObject)
    assert.isTrue(condition)
    assert.isFalse(condition)
    assert.isNull(value)
    assert.isUndefined(value)
    assert.isTrue(Exit.isSuccess(result))
    assert.isTrue(Exit.isFailure(result))
  }))
```

### Testing Complex Data Structures

```typescript
// Bun
import { describe, expect, it } from "@effect-native/bun-test"

it.effect("handles complex data transformations", () =>
  Effect.gen(function*() {
    const input = {
      users: [
        { id: "1", name: "Alice", age: 30 },
        { id: "2", name: "Bob", age: 25 }
      ]
    }

    const result = yield* MyModule.processUsers(input)

    // Test structure
    expect(Array.isArray(result.processedUsers)).toBe(true)
    expect(result.processedUsers.length).toBe(2)

    // Test individual items
    const alice = result.processedUsers.find((u) => u.id === "1")
    expect(alice).toBeDefined()
    expect(alice?.name).toBe("Alice")
    expect(alice?.processed).toBe(true)
  }))
```

## 🔧 TEST ORGANIZATION PATTERNS

### Group Related Tests

```typescript
describe("ModuleName", () => {
  describe("constructors", () => {
    // Tests for creation functions
  })

  describe("combinators", () => {
    // Tests for transformation functions
  })

  describe("predicates", () => {
    // Tests for boolean-returning functions
  })

  describe("error handling", () => {
    // Tests for error conditions
  })

  describe("integration", () => {
    // Tests for service integration
  })
})
```

### Progressive Test Complexity

```typescript
describe("feature progression", () => {
  it.effect("basic functionality", () => /* simple test */)

  it.effect("with configuration", () => /* configuration test */)

  it.effect("with error handling", () => /* error test */)

  it.effect("with concurrency", () => /* concurrent test */)

  it.effect("full integration", () => /* comprehensive test */)
})
```

This comprehensive testing approach ensures reliable, maintainable test suites that properly validate Effect-based code while avoiding common pitfalls and anti-patterns.
