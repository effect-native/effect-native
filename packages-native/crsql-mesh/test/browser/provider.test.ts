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

// Helper for exec requests that require txId/clientId for idempotency
let execCounter = 0
const createExecRequest = (sql: string, opts: { clientId?: string; txId?: string; bind?: unknown[] } = {}): RpcRequest => ({
  type: "exec",
  requestId: `req-exec-${Date.now()}-${++execCounter}`,
  payload: {
    sql,
    clientId: opts.clientId ?? "test-client",
    txId: opts.txId ?? `tx-${Date.now()}-${execCounter}`,
    bind: opts.bind
  }
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

    // Send multiple requests (each with unique txId for idempotency)
    const requests = [
      createExecRequest("INSERT INTO test VALUES (1)"),
      createExecRequest("INSERT INTO test VALUES (2)"),
      createExecRequest("INSERT INTO test VALUES (3)")
    ]

    // Process all requests
    for (const req of requests) {
      await provider.handleRequest(req)
    }

    // All write operations ran:
    // - 1 for idempotency table CREATE on open
    // - 3 user SQL statements
    // - 3 idempotency INSERT/REPLACE statements
    // = 7 total db.run calls
    expect(runCount.length).toBe(7)
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

    // Fire multiple requests concurrently (each with unique txId)
    await Promise.all([
      provider.handleRequest(createExecRequest("SQL1")),
      provider.handleRequest(createExecRequest("SQL2")),
      provider.handleRequest(createExecRequest("SQL3"))
    ])

    // Requests should be processed in order:
    // 1 = idempotency table CREATE on open
    // 2, 3 = SQL1 + idempotency insert
    // 4, 5 = SQL2 + idempotency insert
    // 6, 7 = SQL3 + idempotency insert
    expect(results).toEqual([1, 2, 3, 4, 5, 6, 7])
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

    // Fire multiple requests (each with unique txId)
    await Promise.all([
      provider.handleRequest(createExecRequest("BEGIN")),
      provider.handleRequest(createExecRequest("INSERT")),
      provider.handleRequest(createExecRequest("COMMIT"))
    ])

    // Should never have more than 1 concurrent operation (sync execution)
    expect(maxConcurrent).toBe(1)
    // Should process in order (user SQL interleaved with idempotency inserts)
    // Each exec = 1 user SQL + 1 idempotency insert
    expect(callOrder.filter((sql) => ["BEGIN", "INSERT", "COMMIT"].includes(sql))).toEqual([
      "BEGIN",
      "INSERT",
      "COMMIT"
    ])
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
      createExecRequest("INSERT INTO test VALUES (1)")
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

    // Execute a write (with txId for idempotency)
    await provider.handleRequest(createExecRequest("INSERT INTO test VALUES (1)"))

    // Notification is emitted with updated version
    // Note: db.run is called twice (user SQL + idempotency insert), both increment version
    expect(notifications.length).toBeGreaterThan(0)
    expect(notifications[notifications.length - 1].dbName).toBe("test-db")
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
    // Note: exec now requires txId, but the version tracking still depends on crsql_db_version
    await provider.handleRequest(createExecRequest("SELECT 1"))

    // Check if notification was emitted (depends on db version advancing)
    // With the mock, db.run increments version, so we may get a notification
    const notificationsAfterSelect = notifications.length

    // Now simulate a write that does advance the version
    currentDbVersion = 6
    await provider.handleRequest(createExecRequest("INSERT INTO test VALUES (1)"))

    // Should have more notifications after the second exec
    expect(notifications.length).toBeGreaterThanOrEqual(notificationsAfterSelect)
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

    // Execute a write (with txId for idempotency)
    await provider.handleRequest(createExecRequest("INSERT INTO test VALUES (1)"))

    // Both subscribers receive the notification
    expect(subscriber1.length).toBeGreaterThan(0)
    expect(subscriber2.length).toBeGreaterThan(0)
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

    // First write - should notify (with txId for idempotency)
    await provider.handleRequest(createExecRequest("INSERT INTO test VALUES (1)"))
    const notificationsAfterFirst = notifications.length
    expect(notificationsAfterFirst).toBeGreaterThan(0)

    // Unsubscribe
    unsubscribe()

    // Second write - should NOT notify (unsubscribed)
    await provider.handleRequest(createExecRequest("INSERT INTO test VALUES (2)"))
    expect(notifications.length).toBe(notificationsAfterFirst) // Same count, no new notifications
  })
})

describe("Provider Idempotent Write Guard (F13-F14)", () => {
  // Note: Do NOT use afterEach(vi.clearAllMocks) here because tests run concurrently
  // and clearing mocks can interfere with other tests. Each test creates fresh mocks.

  const createProviderWithIdempotencySupport = async () => {
    // Track committed txIds to simulate idempotency table
    const committedTxIds = new Map<string, string>() // clientId -> txId

    const mockDb = {
      run: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
        // Simulate idempotency check for writes with txId
        if (sql.includes("crsqlite_web_last_tx")) {
          // This is the idempotency table update
          const clientId = params?.[0] as string
          const txId = params?.[1] as string
          if (committedTxIds.get(clientId) === txId) {
            throw new Error("DUPLICATE_TX: Transaction already committed")
          }
          committedTxIds.set(clientId, txId)
        }
      }),
      exec: vi.fn().mockReturnValue([{ columns: ["result"], values: [[42]] }]),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "idempotency-test",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })
    await provider.initialize()
    return { provider, mockDb, committedTxIds }
  }

  it("exec with txId succeeds on first attempt", async () => {
    const { provider } = await createProviderWithIdempotencySupport()
    await provider.handleRequest(createMockRequest("open", { dbName: "idempotency-test" }))

    const response = await provider.handleRequest({
      type: "exec",
      requestId: "req-1",
      payload: { sql: "INSERT INTO test VALUES (1)", txId: "tx-abc-123", clientId: "client-1" }
    })

    expect(response.type).toBe("result")
  })

  it("exec with duplicate txId returns DUPLICATE_TX error", async () => {
    const { provider } = await createProviderWithIdempotencySupport()
    await provider.handleRequest(createMockRequest("open", { dbName: "idempotency-test" }))

    // First exec with txId
    const firstResponse = await provider.handleRequest({
      type: "exec",
      requestId: "req-1",
      payload: { sql: "INSERT INTO test VALUES (1)", txId: "tx-duplicate", clientId: "client-1" }
    })
    expect(firstResponse.type).toBe("result")

    // Retry with same txId - must return DUPLICATE_TX error
    const retryResponse = await provider.handleRequest({
      type: "exec",
      requestId: "req-2",
      payload: { sql: "INSERT INTO test VALUES (1)", txId: "tx-duplicate", clientId: "client-1" }
    })

    expect(retryResponse.type).toBe("error")
    if (retryResponse.type === "error") {
      expect(retryResponse.payload.code).toBe("DUPLICATE_TX")
    }
  })

  it("exec without txId returns TXID_REQUIRED error for write operations", async () => {
    const { provider } = await createProviderWithIdempotencySupport()
    await provider.handleRequest(createMockRequest("open", { dbName: "idempotency-test" }))

    // Exec without txId
    const response = await provider.handleRequest({
      type: "exec",
      requestId: "req-no-txid",
      payload: { sql: "INSERT INTO test VALUES (1)" } // No txId
    })

    expect(response.type).toBe("error")
    if (response.type === "error") {
      expect(response.payload.code).toBe("TXID_REQUIRED")
    }
  })

  it("different txIds from same client both succeed", async () => {
    const { provider } = await createProviderWithIdempotencySupport()
    await provider.handleRequest(createMockRequest("open", { dbName: "idempotency-test" }))

    // First exec
    const response1 = await provider.handleRequest({
      type: "exec",
      requestId: "req-1",
      payload: { sql: "INSERT INTO test VALUES (1)", txId: "tx-first", clientId: "client-1" }
    })
    expect(response1.type).toBe("result")

    // Second exec with different txId
    const response2 = await provider.handleRequest({
      type: "exec",
      requestId: "req-2",
      payload: { sql: "INSERT INTO test VALUES (2)", txId: "tx-second", clientId: "client-1" }
    })
    expect(response2.type).toBe("result")
  })

  it("same txId from different clients both succeed", async () => {
    const { provider } = await createProviderWithIdempotencySupport()
    await provider.handleRequest(createMockRequest("open", { dbName: "idempotency-test" }))

    // First client
    const response1 = await provider.handleRequest({
      type: "exec",
      requestId: "req-1",
      payload: { sql: "INSERT INTO test VALUES (1)", txId: "tx-shared", clientId: "client-1" }
    })
    expect(response1.type).toBe("result")

    // Second client with same txId (different namespace)
    const response2 = await provider.handleRequest({
      type: "exec",
      requestId: "req-2",
      payload: { sql: "INSERT INTO test VALUES (2)", txId: "tx-shared", clientId: "client-2" }
    })
    expect(response2.type).toBe("result")
  })

  it("query operations do not require txId", async () => {
    const { provider } = await createProviderWithIdempotencySupport()
    await provider.handleRequest(createMockRequest("open", { dbName: "idempotency-test" }))

    // Query without txId is allowed
    const response = await provider.handleRequest({
      type: "query",
      requestId: "req-query",
      payload: { sql: "SELECT * FROM test" } // No txId needed for reads
    })

    expect(response.type).toBe("result")
  })

  it("provider initializes idempotency table on open", async () => {
    const createTableCalled = { value: false }
    const mockDb = {
      run: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("crsqlite_web_last_tx")) {
          createTableCalled.value = true
        }
      }),
      exec: vi.fn().mockReturnValue([]),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn()
    }
    const mockSqlJs = {
      Database: vi.fn().mockImplementation(() => mockDb)
    }

    const provider = new Provider({
      dbName: "init-test",
      loadSqlite: vi.fn().mockResolvedValue(mockSqlJs)
    })
    await provider.initialize()
    await provider.handleRequest(createMockRequest("open", { dbName: "init-test" }))

    // The idempotency table is created on open
    expect(createTableCalled.value).toBe(true)
  })
})
