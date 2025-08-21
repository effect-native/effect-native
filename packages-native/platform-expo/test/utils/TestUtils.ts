/**
 * Test utilities and helpers for platform-expo tests
 * @since 1.0.0
 */

import { Effect, Layer } from "effect"
import * as ExpoHttpClient from "../../src/ExpoHttpClient.js"
import * as ExpoSocket from "../../src/ExpoSocket.js"
import type { MockFileSystem, MockSecureStore } from "../mocks/ExpoMocks.js"
import { MockAsyncStorage, MockWebSocket } from "../mocks/ExpoMocks.js"

/**
 * Create a test runtime with mocked Expo services
 * @since 1.0.0
 */
export const makeTestRuntime = <R, E, A>(
  effect: Effect.Effect<A, E, R>,
  options?: {
    asyncStorage?: MockAsyncStorage
    secureStore?: MockSecureStore
    fileSystem?: MockFileSystem
    fetch?: typeof globalThis.fetch
    WebSocket?: typeof globalThis.WebSocket
  }
) => {
  const layers: Array<Layer.Layer<any, never, never>> = []

  if (options?.asyncStorage) {
    layers.push(Layer.succeed("AsyncStorage", options.asyncStorage))
  }
  if (options?.secureStore) {
    layers.push(Layer.succeed("SecureStore", options.secureStore))
  }
  if (options?.fileSystem) {
    layers.push(Layer.succeed("FileSystem", options.fileSystem))
  }
  if (options?.fetch) {
    layers.push(Layer.succeed(ExpoHttpClient.Fetch, options.fetch))
  }
  if (options?.WebSocket) {
    layers.push(Layer.succeed(ExpoSocket.WebSocketConstructor, options.WebSocket))
  }

  const combinedLayer = layers.reduce((acc, layer) => Layer.merge(acc, layer), Layer.empty)

  return Effect.provide(effect, combinedLayer)
}

/**
 * Test helper for async operations with timeout
 * @since 1.0.0
 */
export const withTimeout = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  ms: number = 5000
) => Effect.timeout(effect, `${ms} millis`)

/**
 * Helper to create test data files
 * @since 1.0.0
 */
export const createTestFile = (
  fs: MockFileSystem,
  path: string,
  content: string | Uint8Array
): string => {
  const contentStr = typeof content === "string" ? content : new TextDecoder().decode(content)
  fs.writeAsStringAsync(path, contentStr)
  return path
}

/**
 * Helper to setup test directory structure
 * @since 1.0.0
 */
export const setupTestDirectory = async (
  fs: MockFileSystem,
  structure: Record<string, string | { isDirectory: true }>
): Promise<void> => {
  for (const [path, content] of Object.entries(structure)) {
    if (typeof content === "object" && content.isDirectory) {
      await fs.makeDirectoryAsync(path)
    } else {
      await fs.writeAsStringAsync(path, content as string)
    }
  }
}

/**
 * Helper for testing streaming operations
 * @since 1.0.0
 */
export const collectStream = <A>(stream: ReadableStream<A>): Promise<Array<A>> => {
  return new Promise(async (resolve, reject) => {
    const reader = stream.getReader()
    const chunks: Array<A> = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      resolve(chunks)
    } catch (error) {
      reject(error)
    } finally {
      reader.releaseLock()
    }
  })
}

/**
 * Helper for testing WebSocket connections
 * @since 1.0.0
 */
export class TestWebSocketServer {
  private connections: Array<MockWebSocket> = []
  private messageHandlers: Array<(data: unknown, ws: MockWebSocket) => void> = []

  onConnection(ws: MockWebSocket): void {
    this.connections.push(ws)
  }

  onMessage(handler: (data: unknown, ws: MockWebSocket) => void): void {
    this.messageHandlers.push(handler)
  }

  broadcast(data: string | ArrayBuffer | Blob): void {
    this.connections.forEach((ws) => {
      if (ws.readyState === MockWebSocket.OPEN) {
        ws.mockReceive(data)
      }
    })
  }

  closeAll(code?: number, reason?: string): void {
    this.connections.forEach((ws) => ws.close(code, reason))
    this.connections = []
  }
}

/**
 * Helper for testing HTTP requests
 * @since 1.0.0
 */
export const createMockResponse = (
  body: unknown,
  options?: {
    status?: number
    headers?: Record<string, string>
  }
): Response => {
  const headers = new Headers(options?.headers || {})

  let bodyInit: BodyInit | null = null
  if (body !== null && body !== undefined) {
    if (typeof body === "string") {
      bodyInit = body
    } else {
      bodyInit = JSON.stringify(body)
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json")
      }
    }
  }

  return new Response(bodyInit, {
    status: options?.status || 200,
    headers
  })
}

/**
 * Helper for testing key-value operations
 * @since 1.0.0
 */
export class TestKeyValueStore {
  private store: MockAsyncStorage | MockSecureStore

  constructor(store: MockAsyncStorage | MockSecureStore) {
    this.store = store
  }

  async seedData(data: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      if (this.store instanceof MockAsyncStorage) {
        await this.store.setItem(key, value)
      } else {
        await this.store.setItemAsync(key, value)
      }
    }
  }

  async getAllData(): Promise<Record<string, string>> {
    if (this.store instanceof MockAsyncStorage) {
      const keys = await this.store.getAllKeys()
      const result: Record<string, string> = {}
      for (const key of keys) {
        const value = await this.store.getItem(key)
        if (value !== null) {
          result[key] = value
        }
      }
      return result
    }
    // MockSecureStore doesn't have getAllKeys, so we'd need to track keys separately
    return {}
  }

  async clear(): Promise<void> {
    if (this.store instanceof MockAsyncStorage) {
      await this.store.clear()
    }
    // MockSecureStore doesn't have clear, would need to track and delete individually
  }
}

/**
 * Assertion helpers
 * @since 1.0.0
 */
export const assertFileExists = async (fs: MockFileSystem, path: string): Promise<void> => {
  const info = await fs.getInfoAsync(path)
  if (!info.exists) {
    throw new Error(`File does not exist: ${path}`)
  }
}

export const assertFileContent = async (
  fs: MockFileSystem,
  path: string,
  expectedContent: string
): Promise<void> => {
  const content = await fs.readAsStringAsync(path)
  if (content !== expectedContent) {
    throw new Error(`File content mismatch. Expected: ${expectedContent}, Got: ${content}`)
  }
}

export const assertDirectoryContains = async (
  fs: MockFileSystem,
  dirPath: string,
  expectedFiles: Array<string>
): Promise<void> => {
  const files = await fs.readDirectoryAsync(dirPath)
  const missing = expectedFiles.filter((f) => !files.includes(f))
  if (missing.length > 0) {
    throw new Error(`Directory ${dirPath} missing files: ${missing.join(", ")}`)
  }
}

/**
 * Cleanup helper for tests
 * @since 1.0.0
 */
export const cleanupTest = async (
  resources: {
    fileSystem?: MockFileSystem
    keyValueStore?: TestKeyValueStore
    webSocketServer?: TestWebSocketServer
  }
): Promise<void> => {
  if (resources.keyValueStore) {
    await resources.keyValueStore.clear()
  }
  if (resources.webSocketServer) {
    resources.webSocketServer.closeAll()
  }
  // MockFileSystem cleanup would go here if needed
}
