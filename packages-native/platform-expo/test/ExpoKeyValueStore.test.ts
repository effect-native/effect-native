import { KeyValueStore } from "@effect/platform"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { ExpoKeyValueStore } from "../src"

describe("ExpoKeyValueStore", () => {
  it("should create an AsyncStorage layer", () => {
    const layer = ExpoKeyValueStore.layerAsyncStorage
    expect(layer).toBeDefined()
  })

  it("should create a SecureStore layer", () => {
    const layer = ExpoKeyValueStore.layerSecureStore
    expect(layer).toBeDefined()
  })

  it("should implement KeyValueStore interface", () => {
    const program = Effect.gen(function*() {
      const store = yield* KeyValueStore.KeyValueStore
      return store
    })

    const runnableAsync = program.pipe(
      Effect.provide(ExpoKeyValueStore.layerAsyncStorage)
    )

    const runnableSecure = program.pipe(
      Effect.provide(ExpoKeyValueStore.layerSecureStore)
    )

    expect(runnableAsync).toBeDefined()
    expect(runnableSecure).toBeDefined()
  })
})