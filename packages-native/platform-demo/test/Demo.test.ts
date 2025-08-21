import { describe, it, expect } from "vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

describe("Platform Demo", () => {
  it("should load FileSystemDemo module", async () => {
    const module = await import("../src/FileSystemDemo.js")
    expect(module.basicOperations).toBeDefined()
    expect(module.directoryOperations).toBeDefined()
    expect(module.streamOperations).toBeDefined()
  })

  it("should load HttpClientDemo module", async () => {
    const module = await import("../src/HttpClientDemo.js")
    expect(module.basicRequests).toBeDefined()
    expect(module.headerManipulation).toBeDefined()
    expect(module.clientConfiguration).toBeDefined()
  })

  it("should load HttpServerDemo module", async () => {
    const module = await import("../src/HttpServerDemo.js")
    expect(module.basicRouting).toBeDefined()
    expect(module.middlewareDemo).toBeDefined()
    expect(module.streamingDemo).toBeDefined()
  })

  it("should load KeyValueStoreDemo module", async () => {
    const module = await import("../src/KeyValueStoreDemo.js")
    expect(module.basicOperations).toBeDefined()
    expect(module.batchOperations).toBeDefined()
    expect(module.complexDataTypes).toBeDefined()
  })

  it("should load TerminalDemo module", async () => {
    const module = await import("../src/TerminalDemo.js")
    expect(module.basicInput).toBeDefined()
    expect(module.coloredOutput).toBeDefined()
    expect(module.interactiveMenu).toBeDefined()
  })

  it("should load SocketDemo module", async () => {
    const module = await import("../src/SocketDemo.js")
    expect(module.clientConnection).toBeDefined()
    expect(module.bidirectionalChat).toBeDefined()
    expect(module.streamingData).toBeDefined()
  })

  it("should load PathDemo module", async () => {
    const module = await import("../src/PathDemo.js")
    expect(module.basicOperations).toBeDefined()
    expect(module.pathParsing).toBeDefined()
    expect(module.pathChecks).toBeDefined()
  })

  it("should load CommandDemo module", async () => {
    const module = await import("../src/CommandDemo.js")
    expect(module.basicExecution).toBeDefined()
    expect(module.streamingOutput).toBeDefined()
    expect(module.environmentVariables).toBeDefined()
  })

  it("should have working DemoHelpers", async () => {
    const { runDemo } = await import("../src/utils/DemoHelpers.js")
    
    const successDemo = Effect.succeed("test value")
    const result = await Effect.runPromise(runDemo("Test Demo", successDemo))
    
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value).toBe("test value")
    }
  })

  it("should handle demo errors gracefully", async () => {
    const { runDemo } = await import("../src/utils/DemoHelpers.js")
    
    const errorDemo = Effect.fail("test error")
    const result = await Effect.runPromise(runDemo("Error Demo", errorDemo))
    
    expect(Option.isNone(result)).toBe(true)
  })
})