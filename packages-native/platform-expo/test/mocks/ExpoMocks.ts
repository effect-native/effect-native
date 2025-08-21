/**
 * Mock implementations for Expo APIs used in testing
 * @since 1.0.0
 */

import { Effect, Layer } from "effect"

// Mock AsyncStorage
export class MockAsyncStorage {
  private storage = new Map<string, string>()

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value)
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key)
  }

  async clear(): Promise<void> {
    this.storage.clear()
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys())
  }

  async multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
    return keys.map(key => [key, this.storage.get(key) ?? null])
  }

  async multiSet(keyValuePairs: Array<[string, string]>): Promise<void> {
    keyValuePairs.forEach(([key, value]) => this.storage.set(key, value))
  }

  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach(key => this.storage.delete(key))
  }
}

// Mock SecureStore
export class MockSecureStore {
  private storage = new Map<string, string>()

  async getItemAsync(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.storage.set(key, value)
  }

  async deleteItemAsync(key: string): Promise<void> {
    this.storage.delete(key)
  }
}

// Mock FileSystem
export class MockFileSystem {
  private files = new Map<string, { content: string; isDirectory: boolean }>()
  private tempCounter = 0

  constructor() {
    // Initialize with temp directory
    this.files.set("/tmp", { content: "", isDirectory: true })
  }

  documentDirectory = "/documents/"
  cacheDirectory = "/cache/"

  async readAsStringAsync(uri: string): Promise<string> {
    const file = this.files.get(uri)
    if (!file || file.isDirectory) {
      throw new Error(`File not found: ${uri}`)
    }
    return file.content
  }

  async writeAsStringAsync(uri: string, content: string): Promise<void> {
    this.files.set(uri, { content, isDirectory: false })
  }

  async deleteAsync(uri: string): Promise<void> {
    this.files.delete(uri)
  }

  async makeDirectoryAsync(uri: string): Promise<void> {
    this.files.set(uri, { content: "", isDirectory: true })
  }

  async getInfoAsync(uri: string): Promise<{ exists: boolean; isDirectory: boolean; size?: number }> {
    const file = this.files.get(uri)
    if (!file) {
      return { exists: false, isDirectory: false }
    }
    return {
      exists: true,
      isDirectory: file.isDirectory,
      size: file.isDirectory ? undefined : file.content.length
    }
  }

  async readDirectoryAsync(uri: string): Promise<string[]> {
    const entries: string[] = []
    const prefix = uri.endsWith("/") ? uri : uri + "/"
    
    for (const [path] of this.files) {
      if (path.startsWith(prefix) && path !== uri) {
        const relativePath = path.slice(prefix.length)
        const parts = relativePath.split("/")
        if (parts.length === 1 || (parts.length === 2 && parts[1] === "")) {
          entries.push(parts[0])
        }
      }
    }
    
    return [...new Set(entries)]
  }

  async moveAsync(options: { from: string; to: string }): Promise<void> {
    const file = this.files.get(options.from)
    if (!file) {
      throw new Error(`File not found: ${options.from}`)
    }
    this.files.set(options.to, file)
    this.files.delete(options.from)
  }

  async copyAsync(options: { from: string; to: string }): Promise<void> {
    const file = this.files.get(options.from)
    if (!file) {
      throw new Error(`File not found: ${options.from}`)
    }
    this.files.set(options.to, { ...file })
  }

  createTempFile(): string {
    const path = `/tmp/temp_${this.tempCounter++}`
    this.files.set(path, { content: "", isDirectory: false })
    return path
  }

  createTempDirectory(): string {
    const path = `/tmp/tempdir_${this.tempCounter++}`
    this.files.set(path, { content: "", isDirectory: true })
    return path
  }
}

// Mock Network/Fetch
export const createMockFetch = (responses: Record<string, Response>) => {
  return async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlString = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url
    const response = responses[urlString]
    if (!response) {
      return new Response("Not Found", { status: 404 })
    }
    return response
  }
}

// Mock WebSocket
export class MockWebSocket extends EventTarget {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  protocol = ""
  bufferedAmount = 0
  extensions = ""
  binaryType: BinaryType = "blob"

  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(url: string, protocols?: string | string[]) {
    super()
    this.url = url
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      const event = new Event("open")
      this.onopen?.(event)
      this.dispatchEvent(event)
    }, 0)
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error("WebSocket is not open")
    }
    // Mock send - could trigger server mock responses here
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === MockWebSocket.CLOSING || this.readyState === MockWebSocket.CLOSED) {
      return
    }
    
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      const event = new CloseEvent("close", { code, reason })
      this.onclose?.(event)
      this.dispatchEvent(event)
    }, 0)
  }

  // Helper method for testing - simulate receiving a message
  mockReceive(data: string | ArrayBuffer | Blob): void {
    if (this.readyState === MockWebSocket.OPEN) {
      const event = new MessageEvent("message", { data })
      this.onmessage?.(event)
      this.dispatchEvent(event)
    }
  }
}

// Layer factories for easy test setup
export const mockAsyncStorageLayer = Layer.succeed("AsyncStorage", new MockAsyncStorage())
export const mockSecureStoreLayer = Layer.succeed("SecureStore", new MockSecureStore())
export const mockFileSystemLayer = Layer.succeed("FileSystem", new MockFileSystem())

// Test data generators
export const generateTestFile = (size: number = 1024): Uint8Array => {
  const data = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    data[i] = Math.floor(Math.random() * 256)
  }
  return data
}

export const generateTestJson = (depth: number = 3): unknown => {
  if (depth === 0) {
    return Math.random() > 0.5 ? Math.random() : `string_${Math.random()}`
  }
  
  const obj: Record<string, unknown> = {}
  const numKeys = Math.floor(Math.random() * 5) + 1
  
  for (let i = 0; i < numKeys; i++) {
    const key = `key_${i}`
    if (Math.random() > 0.7) {
      obj[key] = generateTestJson(depth - 1)
    } else if (Math.random() > 0.5) {
      obj[key] = Array.from({ length: Math.floor(Math.random() * 5) }, () => generateTestJson(depth - 1))
    } else {
      obj[key] = Math.random() > 0.5 ? Math.random() : `value_${i}`
    }
  }
  
  return obj
}