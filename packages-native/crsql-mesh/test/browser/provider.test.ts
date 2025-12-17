/**
 * Provider Worker Tests
 *
 * Tests for the browser provider worker that:
 * - Owns the OPFS database connection
 * - Uses opfs-sahpool VFS (no SharedArrayBuffer requirement)
 * - Loads sqlite+crsqlite wasm
 * - Processes requests serially
 *
 * @since 0.1.0
 */
import { describe, expect, it, vi } from "vitest"
import { Provider, type RpcRequest, type DbVersionNotification } from "../../src/browser/provider.js"

// Mock for request/response testing
const createMockRequest = (type: string, payload: Record<string, unknown> = {}): RpcRequest => ({
  type,
  requestId: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  payload
})

describe("Provider OPFS Ownership", () => {
  // Note: Do NOT use afterEach(vi.clearAllMocks) here because tests run concurrently
  // and clearing mocks can interfere with other tests. Each test creates fresh mocks.

  it("provider owns single OPFS connection per database", () => {
    const provider = new Provider({ dbName: "test-db" })

    // Provider tracks that it's the owner
    expect(provider.getDbName()).toBe("test-db")
    expect(provider.isOwner()).toBe(false) // Not owner until opened
  })

  it("uses opfs-sahpool VFS for OPFS access", () => {
    const provider = new Provider({ dbName: "test-db" })

    // The VFS setting should be opfs-sahpool (no SharedArrayBuffer requirement)
    expect(provider.getVfsName()).toBe("opfs-sahpool")
  })

  it("loads sqlite+crsqlite wasm bundle", async () => {
    const provider = new Provider({
      dbName: "test-db",
      // Use mock loaders for testing
      loadSqlite: vi.fn().mockResolvedValue({ Database: vi.fn() }),
      loadCrsqlite: vi.fn().mockResolvedValue({ loaded: true })
    })

    await provider.initialize()

    expect(provider.isInitialized()).toBe(true)
  })

  it("opens single database connection", async () => {
    const mockDb = {
      run: vi.fn(),
      exec: vi.fn().mockReturnValue([]),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })

    await provider.initialize()
    const result = await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    expect(result.type).toBe("result")
    expect(provider.isOwner()).toBe(true)
  })
})

describe("Provider Serial Execution", () => {
  // Note: Do NOT use afterEach(vi.clearAllMocks) here because tests run concurrently
  // and clearing mocks can interfere with other tests. Each test creates fresh mocks.

  it("processes requests on a single queue", async () => {
    const runCount: number[] = []
    const mockDb = {
      run: vi.fn().mockImplementation(() => {
        runCount.push(runCount.length + 1)
      }),
      exec: vi.fn().mockReturnValue([]),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })
    await provider.initialize()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    // Send multiple requests
    const requests = [
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (1)" }),
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (2)" }),
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (3)" })
    ]

    // Process all requests
    for (const req of requests) {
      await provider.handleRequest(req)
    }

    // All write operations ran (db.run was called 3 times)
    expect(runCount.length).toBe(3)
  })

  it("queues requests and processes them serially", async () => {
    // Track execution order (sync, like sql.js)
    const results: number[] = []
    const mockDb = {
      run: vi.fn().mockImplementation(() => {
        results.push(results.length + 1)
      }),
      exec: vi.fn().mockReturnValue([]),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })
    await provider.initialize()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    // Fire multiple requests concurrently
    await Promise.all([
      provider.handleRequest(createMockRequest("exec", { sql: "SQL1" })),
      provider.handleRequest(createMockRequest("exec", { sql: "SQL2" })),
      provider.handleRequest(createMockRequest("exec", { sql: "SQL3" }))
    ])

    // Requests should be processed in order (1, 2, 3)
    expect(results).toEqual([1, 2, 3])
  })

  it("does not allow overlapping transactions", async () => {
    let activeTransactions = 0
    let maxConcurrent = 0
    const callOrder: string[] = []

    const mockDb = {
      run: vi.fn().mockImplementation((sql: string) => {
        // Track that operations happen one at a time
        activeTransactions++
        maxConcurrent = Math.max(maxConcurrent, activeTransactions)
        callOrder.push(sql)
        activeTransactions--
      }),
      exec: vi.fn().mockReturnValue([]),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })
    await provider.initialize()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    // Fire multiple requests
    await Promise.all([
      provider.handleRequest(createMockRequest("exec", { sql: "BEGIN" })),
      provider.handleRequest(createMockRequest("exec", { sql: "INSERT" })),
      provider.handleRequest(createMockRequest("exec", { sql: "COMMIT" }))
    ])

    // Should never have more than 1 concurrent operation (sync execution)
    expect(maxConcurrent).toBe(1)
    // Should process in order
    expect(callOrder).toEqual(["BEGIN", "INSERT", "COMMIT"])
  })
})

describe("Provider RPC Interface", () => {
  // Note: Do NOT use afterEach(vi.clearAllMocks) here because tests run concurrently
  // and clearing mocks can interfere with other tests. Each test creates fresh mocks.

  const createProviderWithMock = async () => {
    const mockDb = {
      run: vi.fn(),
      exec: vi.fn().mockReturnValue([{ columns: ["result"], values: [[42]] }]),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })
    await provider.initialize()
    return { provider, mockDb }
  }

  it("handles open request", async () => {
    const { provider } = await createProviderWithMock()
    const response = await provider.handleRequest(
      createMockRequest("open", { dbName: "test-db" })
    )

    expect(response.type).toBe("result")
    if (response.type === "result") {
      expect(response.payload.result).toMatchObject({ success: true })
    }
  })

  it("handles exec request", async () => {
    const { provider, mockDb } = await createProviderWithMock()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    const response = await provider.handleRequest(
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (1)" })
    )

    expect(response.type).toBe("result")
    expect(mockDb.run).toHaveBeenCalledWith("INSERT INTO test VALUES (1)", undefined)
  })

  it("handles query request", async () => {
    const { provider } = await createProviderWithMock()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    const response = await provider.handleRequest(
      createMockRequest("query", { sql: "SELECT 42" })
    )

    expect(response.type).toBe("result")
    if (response.type === "result") {
      expect(response.payload.result).toMatchObject({ rows: [[42]] })
    }
  })

  it("handles close request", async () => {
    const { provider, mockDb } = await createProviderWithMock()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))
    expect(provider.isOwner()).toBe(true)

    const response = await provider.handleRequest(createMockRequest("close", {}))

    expect(response.type).toBe("result")
    expect(mockDb.close).toHaveBeenCalled()
    expect(provider.isOwner()).toBe(false)
  })

  it("handles ping request", async () => {
    const { provider } = await createProviderWithMock()
    const response = await provider.handleRequest(createMockRequest("ping", {}))

    expect(response.type).toBe("result")
    if (response.type === "result") {
      expect(response.payload.result).toMatchObject({ pong: true })
    }
  })

  it("returns error for unknown request type", async () => {
    const { provider } = await createProviderWithMock()
    const response = await provider.handleRequest(
      createMockRequest("unknown-type", {})
    )

    expect(response.type).toBe("error")
    if (response.type === "error") {
      expect(response.payload.code).toBe("UNKNOWN_REQUEST")
    }
  })

  it("returns error when database not open", async () => {
    const { provider } = await createProviderWithMock()
    // Don't open the database
    const response = await provider.handleRequest(
      createMockRequest("query", { sql: "SELECT 1" })
    )

    expect(response.type).toBe("error")
    if (response.type === "error") {
      expect(response.payload.code).toBe("DB_NOT_OPEN")
    }
  })
})

describe("Provider db_version Notification", () => {
  // Note: Do NOT use afterEach(vi.clearAllMocks) here because tests run concurrently
  // and clearing mocks can interfere with other tests. Each test creates fresh mocks.

  it("emits db_version notification after exec completes a write", async () => {
    let currentDbVersion = 0
    const notifications: Array<{ dbName: string; dbVersion: number }> = []

    const mockDb = {
      run: vi.fn().mockImplementation(() => {
        // Simulate db_version advancing after a write
        currentDbVersion++
      }),
      exec: vi.fn().mockImplementation((sql: string) => {
        // When querying crsql_db_version(), return current version
        if (sql.includes("crsql_db_version")) {
          return [{ columns: ["crsql_db_version()"], values: [[currentDbVersion]] }]
        }
        return []
      }),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })

    // Subscribe to notifications
    provider.onVersionChange((notification: DbVersionNotification) => {
      notifications.push(notification)
    })

    await provider.initialize()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    // Execute a write
    await provider.handleRequest(
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (1)" })
    )

    // Notification is emitted with updated version
    expect(notifications.length).toBe(1)
    expect(notifications[0]).toEqual({
      dbName: "test-db",
      dbVersion: 1
    })
  })

  it("emits notification only when db_version advances", async () => {
    let currentDbVersion = 5
    const notifications: Array<{ dbName: string; dbVersion: number }> = []

    const mockDb = {
      run: vi.fn().mockImplementation(() => {
        // This particular run doesn't change db_version (e.g., read-only operation)
      }),
      exec: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("crsql_db_version")) {
          return [{ columns: ["crsql_db_version()"], values: [[currentDbVersion]] }]
        }
        return []
      }),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })

    provider.onVersionChange((notification: DbVersionNotification) => {
      notifications.push(notification)
    })

    await provider.initialize()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    // Execute a statement that doesn't change db_version
    await provider.handleRequest(
      createMockRequest("exec", { sql: "SELECT 1" })
    )

    // No notification because db_version didn't advance
    expect(notifications.length).toBe(0)

    // Now simulate a write that does advance the version
    currentDbVersion = 6
    await provider.handleRequest(
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (1)" })
    )

    // Notification for the version advance
    expect(notifications.length).toBe(1)
    expect(notifications[0].dbVersion).toBe(6)
  })

  it("supports multiple notification subscribers", async () => {
    let currentDbVersion = 0
    const subscriber1: Array<{ dbName: string; dbVersion: number }> = []
    const subscriber2: Array<{ dbName: string; dbVersion: number }> = []

    const mockDb = {
      run: vi.fn().mockImplementation(() => {
        currentDbVersion++
      }),
      exec: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("crsql_db_version")) {
          return [{ columns: ["crsql_db_version()"], values: [[currentDbVersion]] }]
        }
        return []
      }),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })

    // Multiple subscribers
    provider.onVersionChange((n: DbVersionNotification) => subscriber1.push(n))
    provider.onVersionChange((n: DbVersionNotification) => subscriber2.push(n))

    await provider.initialize()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    // Execute a write
    await provider.handleRequest(
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (1)" })
    )

    // Both subscribers receive the notification
    expect(subscriber1.length).toBe(1)
    expect(subscriber2.length).toBe(1)
    expect(subscriber1[0]).toEqual(subscriber2[0])
  })

  it("allows unsubscribing from notifications", async () => {
    let currentDbVersion = 0
    const notifications: Array<{ dbName: string; dbVersion: number }> = []

    const mockDb = {
      run: vi.fn().mockImplementation(() => {
        currentDbVersion++
      }),
      exec: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("crsql_db_version")) {
          return [{ columns: ["crsql_db_version()"], values: [[currentDbVersion]] }]
        }
        return []
      }),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "test-db",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })

    // Subscribe and get unsubscribe function
    const unsubscribe = provider.onVersionChange((n: DbVersionNotification) => notifications.push(n))

    await provider.initialize()
    await provider.handleRequest(createMockRequest("open", { dbName: "test-db" }))

    // First write - should notify
    await provider.handleRequest(
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (1)" })
    )
    expect(notifications.length).toBe(1)

    // Unsubscribe
    unsubscribe()

    // Second write - should NOT notify (unsubscribed)
    await provider.handleRequest(
      createMockRequest("exec", { sql: "INSERT INTO test VALUES (2)" })
    )
    expect(notifications.length).toBe(1) // Still 1, not 2
  })
})
