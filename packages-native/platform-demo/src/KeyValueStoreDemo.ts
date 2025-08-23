/**
 * @since 0.0.1
 */
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { logDemo, logResult, logSection, withTiming } from "./utils/DemoHelpers.js"

/**
 * @since 0.0.1
 * @category demos
 * @example
 * ```ts
 * import * as KeyValueStoreDemo from "@effect-native/platform-demo/KeyValueStoreDemo"
 * import * as NodeKeyValueStore from "@effect/platform-node/NodeKeyValueStore"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 *
 * Effect.provide(
 *   KeyValueStoreDemo.basicOperations,
 *   NodeKeyValueStore.layerMemory
 * ).pipe(Effect.runPromise)
 * ```
 */
export const basicOperations = Effect.gen(function*() {
  yield* logSection("KeyValueStore Basic Operations")

  const store = yield* KeyValueStore.KeyValueStore

  yield* logDemo("Set Value", "Storing a simple value")
  yield* store.set("user:1", "Alice")
  yield* logResult("Value set", "user:1 -> Alice")

  yield* logDemo("Get Value", "Retrieving the stored value")
  const value = yield* store.get("user:1")
  yield* logResult("Retrieved value", Option.getOrElse(value, () => "not found"))

  yield* logDemo("Check Existence", "Checking if key exists")
  const exists = yield* store.has("user:1")
  yield* logResult("Key exists", exists)

  yield* logDemo("Update Value", "Updating existing key")
  yield* store.set("user:1", "Alice Smith")
  const updated = yield* store.get("user:1")
  yield* logResult("Updated value", Option.getOrElse(updated, () => "not found"))

  yield* logDemo("Remove Value", "Deleting a key")
  yield* store.remove("user:1")
  const afterRemove = yield* store.get("user:1")
  yield* logResult("After removal", Option.isNone(afterRemove) ? "key deleted" : "still exists")

  return { operations: "completed" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const batchOperations = Effect.gen(function*() {
  yield* logSection("Batch Operations")

  const store = yield* KeyValueStore.KeyValueStore

  yield* logDemo("Batch Set", "Setting multiple values at once")
  const items = [
    ["product:1", "Laptop"],
    ["product:2", "Mouse"],
    ["product:3", "Keyboard"],
    ["product:4", "Monitor"],
    ["product:5", "Headphones"]
  ] as const

  yield* Effect.forEach(items, ([key, value]) => store.set(key, value))
  yield* logResult("Batch set", `${items.length} items stored`)

  yield* logDemo("Get All", "Retrieving all values")
  const keys = items.map(([key]) => key)
  const values = yield* Effect.forEach(keys, (key) => store.get(key))
  const presentValues = values.filter(Option.isSome).length
  yield* logResult("Retrieved", `${presentValues}/${keys.length} values`)

  yield* logDemo("Clear Range", "Removing multiple keys")
  yield* Effect.forEach(keys.slice(0, 3), (key) => store.remove(key))
  const remaining = yield* Effect.forEach(keys, (key) => store.has(key))
  const remainingCount = remaining.filter(Boolean).length
  yield* logResult("Remaining", `${remainingCount}/${keys.length} keys`)

  yield* logDemo("Clear All", "Removing all keys")
  yield* Effect.forEach(keys, (key) => store.remove(key))
  const afterClear = yield* Effect.forEach(keys, (key) => store.has(key))
  const afterClearCount = afterClear.filter(Boolean).length
  yield* logResult("After clear", `${afterClearCount} keys remaining`)

  return { batchOperations: "completed" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const complexDataTypes = Effect.gen(function*() {
  yield* logSection("Complex Data Types")

  const store = yield* KeyValueStore.KeyValueStore

  yield* logDemo("JSON Objects", "Storing structured data")
  const user = {
    id: 1,
    name: "Bob",
    email: "bob@example.com",
    preferences: {
      theme: "dark",
      notifications: true
    }
  }
  yield* store.set("user:bob", JSON.stringify(user))

  const retrievedJson = yield* store.get("user:bob")
  const parsedUser = Option.map(retrievedJson, (json) => JSON.parse(json))
  yield* logResult("Retrieved object", Option.getOrElse(parsedUser, () => null))

  yield* logDemo("Arrays", "Storing array data")
  const tags = ["javascript", "typescript", "effect", "functional"]
  yield* store.set("tags:programming", JSON.stringify(tags))

  const retrievedTags = yield* store.get("tags:programming")
  const parsedTags = Option.map(retrievedTags, (json) => JSON.parse(json))
  yield* logResult("Retrieved array", Option.getOrElse(parsedTags, () => []))

  yield* logDemo("Binary Data", "Storing base64 encoded data")
  const encoder = new TextEncoder()
  const binaryData = btoa(String.fromCharCode(...encoder.encode("Hello, Binary World!")))
  yield* store.set("data:binary", binaryData)

  const retrievedBinary = yield* store.get("data:binary")
  const decodedBinary = Option.map(retrievedBinary, (b64) => {
    const decoder = new TextDecoder()
    return decoder.decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))
  })
  yield* logResult("Decoded binary", Option.getOrElse(decodedBinary, () => ""))

  return { complexData: "completed" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const namespacedOperations = Effect.gen(function*() {
  yield* logSection("Namespaced Operations")

  const store = yield* KeyValueStore.KeyValueStore

  yield* logDemo("User Namespace", "Organizing user data")
  yield* store.set("users:1:profile", JSON.stringify({ name: "Alice" }))
  yield* store.set("users:1:settings", JSON.stringify({ theme: "light" }))
  yield* store.set("users:2:profile", JSON.stringify({ name: "Bob" }))
  yield* store.set("users:2:settings", JSON.stringify({ theme: "dark" }))
  yield* logResult("User data stored", "2 users with profiles and settings")

  yield* logDemo("Session Namespace", "Managing sessions")
  const sessionId = "sess_" + Math.random().toString(36).substring(7)
  yield* store.set(`sessions:${sessionId}:user`, "1")
  yield* store.set(`sessions:${sessionId}:expires`, new Date(Date.now() + 3600000).toISOString())
  yield* logResult("Session created", sessionId)

  yield* logDemo("Cache Namespace", "Caching computed values")
  yield* store.set("cache:api:users", JSON.stringify({ data: ["user1", "user2"], timestamp: Date.now() }))
  yield* store.set("cache:api:posts", JSON.stringify({ data: ["post1", "post2"], timestamp: Date.now() }))

  const cacheValue = yield* store.get("cache:api:users")
  const cache = Option.map(cacheValue, JSON.parse)
  yield* logResult("Cache retrieved", Option.isSome(cache) ? "Cache hit" : "Cache miss")

  return { namespaces: "organized" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const errorHandling = Effect.gen(function*() {
  yield* logSection("Error Handling")

  const store = yield* KeyValueStore.KeyValueStore

  yield* logDemo("Missing Key", "Handling non-existent keys")
  const missing = yield* store.get("nonexistent:key")
  yield* logResult("Missing key result", Option.isNone(missing) ? "None (as expected)" : "Unexpected value")

  yield* logDemo("Invalid JSON", "Handling parse errors")
  yield* store.set("invalid:json", "not-valid-json{")
  const invalidJson = yield* store.get("invalid:json")
  const parseResult = yield* Effect.try({
    try: () => Option.map(invalidJson, JSON.parse),
    catch: () => "Parse error caught"
  })
  yield* logResult("Parse attempt", parseResult)

  yield* logDemo("Safe Operations", "Using Option for safety")
  const safeGet = (key: string) =>
    store.get(key).pipe(
      Effect.map(Option.getOrElse(() => "default-value"))
    )

  const safeValue = yield* safeGet("safe:missing")
  yield* logResult("Safe get", safeValue)

  return { errorHandling: "demonstrated" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const performancePatterns = Effect.gen(function*() {
  yield* logSection("Performance Patterns")

  const store = yield* KeyValueStore.KeyValueStore

  yield* logDemo("Bulk Write", "Writing many items efficiently")
  const startBulk = Date.now()
  yield* Effect.forEach(
    Array.from({ length: 100 }, (_, i) => [`perf:item:${i}`, `value-${i}`]),
    ([key, value]) => store.set(key, value),
    { concurrency: 10 }
  )
  const bulkDuration = Date.now() - startBulk
  yield* logResult("Bulk write", `100 items in ${bulkDuration}ms`)

  yield* logDemo("Bulk Read", "Reading many items efficiently")
  const startRead = Date.now()
  const keys = Array.from({ length: 100 }, (_, i) => `perf:item:${i}`)
  const values = yield* Effect.forEach(
    keys,
    (key) => store.get(key),
    { concurrency: 10 }
  )
  const readDuration = Date.now() - startRead
  const foundCount = values.filter(Option.isSome).length
  yield* logResult("Bulk read", `${foundCount} items in ${readDuration}ms`)

  yield* logDemo("Conditional Updates", "Update only if exists")
  const updateIfExists = (key: string, value: string) =>
    store.has(key).pipe(
      Effect.flatMap((exists) => exists ? store.set(key, value) : Effect.succeed(undefined))
    )

  yield* updateIfExists("perf:item:0", "updated-value")
  yield* updateIfExists("perf:nonexistent", "should-not-set")

  const updated = yield* store.get("perf:item:0")
  const notSet = yield* store.get("perf:nonexistent")
  yield* logResult("Conditional update", `Updated: ${Option.isSome(updated)}, Not set: ${Option.isNone(notSet)}`)

  return { performance: "optimized" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function*() {
  yield* withTiming("Basic Operations", basicOperations)
  yield* withTiming("Batch Operations", batchOperations)
  yield* withTiming("Complex Data Types", complexDataTypes)
  yield* withTiming("Namespaced Operations", namespacedOperations)
  yield* withTiming("Error Handling", errorHandling)
  yield* withTiming("Performance Patterns", performancePatterns)

  yield* Console.log("\n✨ All KeyValueStore demos completed!")
})
