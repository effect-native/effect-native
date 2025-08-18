import { FileSystem } from "@effect/platform"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { ExpoFileSystem } from "../src"

describe("ExpoFileSystem", () => {
  it("should create a FileSystem layer", () => {
    const layer = ExpoFileSystem.layer()
    expect(layer).toBeDefined()
  })

  it("should provide different storage locations", () => {
    const documentLayer = ExpoFileSystem.layerDocument
    const cacheLayer = ExpoFileSystem.layerCache
    const restrictedLayer = ExpoFileSystem.layerRestricted

    expect(documentLayer).toBeDefined()
    expect(cacheLayer).toBeDefined()
    expect(restrictedLayer).toBeDefined()
  })

  it("should implement FileSystem interface", () => {
    const program = Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      return fs
    })

    const runnable = program.pipe(
      Effect.provide(ExpoFileSystem.layerDocument)
    )

    expect(runnable).toBeDefined()
  })
})