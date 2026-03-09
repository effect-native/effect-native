# Effect Native Development Patterns

## 🎯 OVERVIEW

Fundamental patterns for developing high-quality, type-safe code in this Effect v4 monorepo. These patterns ensure consistency, reliability, and maintainability across the codebase.

## 🚨 CRITICAL FORBIDDEN PATTERNS

### ❌ NEVER: try-catch in Effect.gen

**REASON**: Effect generators handle errors through the Effect type system, not JavaScript exceptions.

```typescript
// ❌ WRONG - This will cause runtime errors
Effect.gen(function*() {
  try {
    const result = yield* someEffect
    return result
  } catch (error) {
    // This will never be reached and breaks Effect semantics
    console.error(error)
  }
})

// ✅ CORRECT - Use Effect's built-in error handling
Effect.gen(function*() {
  const result = yield* Effect.result(someEffect)
  if (result._tag === "Failure") {
    // Handle error case properly
    console.error("Effect failed:", result.cause)
    return yield* Effect.fail("Handled error")
  }
  return result.value
})
```

### ❌ NEVER: Type Assertions

**REASON**: Type assertions hide real type errors and break TypeScript's safety guarantees.

```typescript
// ❌ FORBIDDEN - These break type safety
const value = something as any
const value = something as never
const value = something as unknown

// ✅ CORRECT - Fix the underlying type issues
// Use proper generic type parameters
function processValue<T>(value: T): Effect.Effect<T, never, never> {
  return Effect.succeed(value)
}

// Use proper Effect constructors
const safeValue = Effect.try(() => JSON.parse(jsonString))
```

## ✅ MANDATORY PATTERNS

### 🔄 return yield* Pattern for Errors

**CRITICAL**: Always use `return yield*` when yielding terminal effects.

```typescript
// ✅ CORRECT - Makes termination explicit
Effect.gen(function*() {
  if (invalidCondition) {
    return yield* Effect.fail("Validation failed")
  }

  if (shouldInterrupt) {
    return yield* Effect.interrupt
  }

  // Continue with normal flow
  const result = yield* someOtherEffect
  return result
})

// ❌ WRONG - Missing return keyword leads to unreachable code
Effect.gen(function*() {
  if (invalidCondition) {
    yield* Effect.fail("Validation failed") // Missing return!
    // Unreachable code after error!
  }
})
```

## 🏗️ CORE DEVELOPMENT PATTERNS

### Effect.gen Composition Pattern

Use `Effect.gen` for sequential operations with proper error propagation:

```typescript
import { Console, Effect } from "effect"

const processData = (input: string) =>
  Effect.gen(function*() {
    // Validate input
    if (input.length === 0) {
      return yield* Effect.fail("Input cannot be empty")
    }

    // Transform data
    const processed = yield* Effect.try({
      try: () => JSON.parse(input),
      catch: (error) => `Invalid JSON: ${error}`
    })

    // Log progress
    yield* Console.log(`Processed: ${JSON.stringify(processed)}`)

    return processed
  })
```

### Effect.gen vs Effect.fn vs Effect.fnUntraced

Choose the constructor that matches the job:

- Use `Effect.gen` for one-off inline composition.
- Use `Effect.fn("name")` for reusable public effectful functions.
- Use `Effect.fnUntraced` only for internal or hot-path helpers where tracing overhead matters.

```typescript
import { Effect } from "effect"

const loadUser = Effect.fn("loadUser")(function*(userId: string) {
  return yield* fetchUser(userId)
})

const program = Effect.gen(function*() {
  const user = yield* loadUser("123")
  return user
})

const internalDecode = Effect.fnUntraced(function*(bytes: Uint8Array) {
  return yield* decodeMessage(bytes)
})
```

### Error Handling with Data.TaggedError

Create structured, typed errors using `Data.TaggedError`:

```typescript
import { Data, Effect } from "effect"

// Define custom error types
class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string
  message: string
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  status: number
  url: string
}> {}

// Use in operations
const validateAndFetch = (url: string) =>
  Effect.gen(function*() {
    if (!url.startsWith("https://")) {
      return yield* Effect.fail(
        new ValidationError({
          field: "url",
          message: "URL must use HTTPS"
        })
      )
    }

    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: () => new NetworkError({ status: 0, url })
    })

    if (!response.ok) {
      return yield* Effect.fail(
        new NetworkError({
          status: response.status,
          url
        })
      )
    }

    return response
  })
```

### Resource Management Pattern

Use `Effect.acquireUseRelease` for automatic resource cleanup:

```typescript
import { Console, Effect } from "effect"

// Resource acquisition pattern
const withDatabase = <A, E>(
  operation: (db: Database) => Effect.Effect<A, E, never>
): Effect.Effect<A, E | DatabaseError, never> =>
  Effect.acquireUseRelease(
    // Acquire
    Effect.tryPromise({
      try: () => createDatabaseConnection(),
      catch: (error) => new DatabaseError({ cause: error })
    }),
    // Use
    operation,
    // Release
    (db) => Effect.promise(() => db.close())
  )

// Usage
const queryUser = (id: string) =>
  withDatabase((db) =>
    Effect.gen(function*() {
      const user = yield* Effect.tryPromise({
        try: () => db.query("SELECT * FROM users WHERE id = ?", [id]),
        catch: (error) => new QueryError({ query: "users", cause: error })
      })

      yield* Console.log(`Found user: ${user.name}`)
      return user
    })
  )
```

### Layer Composition Pattern

Build applications using layered architecture:

```typescript
import { Effect, Layer, ServiceMap } from "effect"

class DatabaseService extends ServiceMap.Service<DatabaseService>()("example/DatabaseService", {
  effect: Effect.succeed({
    query: (sql: string): Effect.Effect<ReadonlyArray<unknown>, DatabaseError> =>
      Effect.tryPromise({
        try: () => database.execute(sql),
        catch: (error) => new DatabaseError({ cause: error })
      })
  })
}) {}

class UserService extends ServiceMap.Service<UserService>()("example/UserService", {
  effect: Effect.gen(function*() {
    const db = yield* DatabaseService

    return UserService.of({
      getUser: Effect.fn("UserService.getUser")(function*(id: string) {
        const rows = yield* db.query(`SELECT * FROM users WHERE id = '${id}'`)
        const row = rows[0]
        if (!row) {
          return yield* new UserError({ message: "User not found" })
        }
        return row
      })
    })
  })
}) {}

const AppLayer = UserService.Default.pipe(Layer.provide(DatabaseService.Default))
```

## 🔧 DEVELOPMENT WORKFLOW PATTERNS

### Immediate Linting Pattern

**MANDATORY**: Always lint TypeScript files immediately after editing:

```bash
# After editing any TypeScript file
bun run lint-fix

# This ensures:
# - Consistent code formatting
# - Early detection of style issues
# - Compliance with project standards
```

### Validation Checkpoint Pattern

Run comprehensive validation after implementation:

```bash
# 1. Lint all modified files
bun run lint-fix

# 2. Validate JSDoc examples compile
bun run docgen

# 3. Check types
bun run check

# 4. Run tests
bun run test

# 5. Build project
bun run build
```

### Progressive Implementation Pattern

Break complex features into validated increments:

```typescript
// Step 1: Basic structure with types
interface FeatureConfig {
  readonly option1: string
  readonly option2: number
}

// Step 2: Core implementation
const createFeature = (config: FeatureConfig) =>
  Effect.gen(function*() {
    // Basic implementation
    yield* Console.log("Feature created")
    return { config }
  })

// Step 3: Add error handling
const createFeatureWithValidation = (config: FeatureConfig) =>
  Effect.gen(function*() {
    if (config.option2 < 0) {
      return yield* Effect.fail("Option2 must be positive")
    }

    const feature = yield* createFeature(config)
    return feature
  })

// Step 4: Add comprehensive functionality
// ... continue building incrementally
```

## 📚 INTEGRATION PATTERNS

### Module Export Pattern

Structure module exports for clarity and discoverability:

````typescript
// ModuleName.ts
/**
 * @since 1.0.0
 */

// Internal implementations
const internal = {
  // Private helper functions
}

// Public API exports

/**
 * Creates a new instance with the given configuration.
 *
 * @example
 * ```ts
 * import { ModuleName } from "effect"
 *
 * const instance = ModuleName.create({ value: 42 })
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const create: <A>(config: Config<A>) => Effect.Effect<Instance<A>, never, never> = (config) =>
  Effect.succeed({ config })

/**
 * Transforms an instance using the provided function.
 *
 * @example
 * ```ts
 * import { ModuleName, Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const instance = yield* ModuleName.create({ value: 42 })
 *   const transformed = yield* ModuleName.map(instance, x => x * 2)
 *   return transformed
 * })
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const map: <A, B>(instance: Instance<A>, f: (a: A) => B) => Effect.Effect<Instance<B>, never, never> = (
  instance,
  f
) => Effect.succeed({ config: f(instance.config) })
````

### Testing Integration Pattern

Structure tests to validate all aspects of functionality:

```typescript
import { describe, expect, it } from "@effect-native/bun-test"
import { Duration, Effect, TestClock } from "effect"
import * as ModuleName from "../src/ModuleName.js"

describe("ModuleName", () => {
  describe("constructors", () => {
    it.effect("create initializes with config", () =>
      Effect.gen(function*() {
        const config = { value: 42 }
        const instance = yield* ModuleName.create(config)

        expect(instance.config).toEqual(config)
      }))
  })

  describe("combinators", () => {
    it.effect("map transforms instance", () =>
      Effect.gen(function*() {
        const instance = yield* ModuleName.create({ value: 10 })
        const transformed = yield* ModuleName.map(instance, (x) => x * 2)

        expect(transformed.config.value).toBe(20)
      }))
  })

  describe("time-dependent operations", () => {
    it.effect("delayed operations complete after virtual time advances", () =>
      Effect.gen(function*() {
        const fiber = yield* Effect.fork(
          ModuleName.delayedOperation(Duration.seconds(5))
        )

        yield* TestClock.adjust(Duration.seconds(5))

        const result = yield* Effect.join(fiber)
        expect(result).toBe("completed")
      }))
  })
})
```

These patterns keep development in this repo consistent with Effect v4 and the existing package design.
