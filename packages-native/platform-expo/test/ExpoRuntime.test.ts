import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { ExpoRuntime } from "../src"

describe("ExpoRuntime", () => {
  it("should export runtime functions", () => {
    expect(ExpoRuntime.runMain).toBeDefined()
    expect(ExpoRuntime.runFork).toBeDefined()
    expect(ExpoRuntime.runPromise).toBeDefined()
    expect(ExpoRuntime.runSync).toBeDefined()
    expect(ExpoRuntime.make).toBeDefined()
    expect(ExpoRuntime.makeDisposable).toBeDefined()
  })

  it("should create runtime with custom layer", () => {
    const runtime = ExpoRuntime.make(Layer.empty)
    expect(runtime).toBeDefined()
  })
})
