/**
 * Provider Worker for OPFS Database Ownership
 *
 * The provider is a dedicated Worker that:
 * - Owns the single OPFS database connection
 * - Uses opfs-sahpool VFS (no SharedArrayBuffer requirement)
 * - Loads sqlite+crsqlite wasm bundle
 * - Processes requests serially to avoid overlapping transactions
 *
 * @since 0.1.0
 */

/** RPC request from coordinator */
export interface RpcRequest {
  readonly type: string
  readonly requestId: string
  readonly payload?: Record<string, unknown>
}

/** Result response */
export interface ResultResponse {
  readonly type: "result"
  readonly requestId: string
  readonly payload: { result: unknown }
}

/** Error response */
export interface ErrorResponse {
  readonly type: "error"
  readonly requestId: string
  readonly payload: { code: string; message: string }
}

/** RPC response union */
export type RpcResponse = ResultResponse | ErrorResponse

/** Provider configuration */
export interface ProviderConfig {
  readonly dbName: string
  readonly vfs?: string
  readonly loadSqlite?: () => Promise<SqlJs>
  readonly loadCrsqlite?: () => Promise<unknown>
}

/** Minimal SqlJs interface */
interface SqlJs {
  Database: new (data?: ArrayLike<number>) => SqlJsDatabase
}

/** Minimal SqlJs Database interface */
interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
  export(): Uint8Array
  close(): void
}

/** Create a result response */
const createResultResponse = (requestId: string, result: unknown): ResultResponse => ({
  type: "result",
  requestId,
  payload: { result }
})

/** Create an error response */
const createErrorResponse = (requestId: string, code: string, message: string): ErrorResponse => ({
  type: "error",
  requestId,
  payload: { code, message }
})

/**
 * Provider class for managing OPFS database access.
 *
 * This class implements the provider role described in the Browser Multi-Tab design:
 * - Owns the single OPFS database connection
 * - Processes requests serially on a queue
 * - Uses opfs-sahpool VFS (no SharedArrayBuffer requirement)
 *
 * @since 0.1.0
 */
export class Provider {
  private readonly dbName: string
  private readonly vfs: string
  private readonly loadSqlite: () => Promise<SqlJs>
  private readonly loadCrsqlite: (() => Promise<unknown>) | undefined

  private initialized = false
  private owner = false
  private sqlJs: SqlJs | null = null
  private db: SqlJsDatabase | null = null

  // Request queue for serial execution
  private readonly requestQueue: Array<{
    request: RpcRequest
    resolve: (response: RpcResponse) => void
  }> = []
  private processing = false

  constructor(config: ProviderConfig) {
    this.dbName = config.dbName
    this.vfs = config.vfs ?? "opfs-sahpool"
    this.loadSqlite = config.loadSqlite ?? defaultLoadSqlite
    this.loadCrsqlite = config.loadCrsqlite
  }

  /**
   * Get the database name.
   */
  getDbName(): string {
    return this.dbName
  }

  /**
   * Get the VFS name.
   */
  getVfsName(): string {
    return this.vfs
  }

  /**
   * Check if provider is initialized.
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Check if provider owns the database connection.
   */
  isOwner(): boolean {
    return this.owner
  }

  /**
   * Initialize the provider (load wasm, etc).
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Load SQLite WASM
    this.sqlJs = await this.loadSqlite()

    // Load CR-SQLite extension if provided
    if (this.loadCrsqlite) {
      await this.loadCrsqlite()
    }

    this.initialized = true
  }

  /**
   * Handle an RPC request.
   * Requests are queued and processed serially.
   */
  async handleRequest(request: RpcRequest): Promise<RpcResponse> {
    return new Promise((resolve) => {
      this.requestQueue.push({ request, resolve })
      this.processQueue()
    })
  }

  /**
   * Process the request queue serially.
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return
    }

    this.processing = true

    while (this.requestQueue.length > 0) {
      const item = this.requestQueue.shift()
      if (item) {
        try {
          const result = await this.executeRequest(item.request)
          item.resolve(result)
        } catch (e) {
          item.resolve(
            createErrorResponse(
              item.request.requestId,
              "INTERNAL_ERROR",
              e instanceof Error ? e.message : String(e)
            )
          )
        }
      }
    }

    this.processing = false
  }

  /**
   * Execute a single request.
   */
  private async executeRequest(request: RpcRequest): Promise<RpcResponse> {
    switch (request.type) {
      case "open":
        return this.handleOpen(request)
      case "close":
        return this.handleClose(request)
      case "exec":
        return this.handleExec(request)
      case "query":
        return this.handleQuery(request)
      case "ping":
        return this.handlePing(request)
      default:
        return createErrorResponse(
          request.requestId,
          "UNKNOWN_REQUEST",
          `Unknown request type: ${request.type}`
        )
    }
  }

  /**
   * Handle open database request.
   */
  private async handleOpen(request: RpcRequest): Promise<RpcResponse> {
    if (!this.sqlJs) {
      return createErrorResponse(request.requestId, "NOT_INITIALIZED", "Provider not initialized")
    }

    // Close existing database if open
    if (this.db) {
      this.db.close()
      this.db = null
      this.owner = false
    }

    // Create new database
    this.db = new this.sqlJs.Database()
    this.owner = true

    return createResultResponse(request.requestId, { success: true, persistent: false })
  }

  /**
   * Handle close database request.
   */
  private async handleClose(request: RpcRequest): Promise<RpcResponse> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.owner = false
    }

    return createResultResponse(request.requestId, { success: true })
  }

  /**
   * Handle exec (write) request.
   */
  private async handleExec(request: RpcRequest): Promise<RpcResponse> {
    if (!this.db) {
      return createErrorResponse(request.requestId, "DB_NOT_OPEN", "Database not open")
    }

    const payload = request.payload as { sql: string; bind?: unknown[] } | undefined
    if (!payload?.sql) {
      return createErrorResponse(request.requestId, "INVALID_REQUEST", "Missing SQL")
    }

    this.db.run(payload.sql, payload.bind)

    return createResultResponse(request.requestId, { changes: 0 })
  }

  /**
   * Handle query (read) request.
   */
  private async handleQuery(request: RpcRequest): Promise<RpcResponse> {
    if (!this.db) {
      return createErrorResponse(request.requestId, "DB_NOT_OPEN", "Database not open")
    }

    const payload = request.payload as { sql: string; bind?: unknown[] } | undefined
    if (!payload?.sql) {
      return createErrorResponse(request.requestId, "INVALID_REQUEST", "Missing SQL")
    }

    const results = this.db.exec(payload.sql)
    const rows = results.length > 0 ? results[0].values : []

    return createResultResponse(request.requestId, { rows })
  }

  /**
   * Handle ping request.
   */
  private async handlePing(request: RpcRequest): Promise<RpcResponse> {
    return createResultResponse(request.requestId, { pong: true, timestamp: Date.now() })
  }
}

/**
 * Default SQLite loader (browser environment).
 * In production this would load from CDN or bundled wasm.
 */
const defaultLoadSqlite = async (): Promise<SqlJs> => {
  // This is a placeholder - in a real implementation this would:
  // 1. Fetch sql.js wasm from CDN
  // 2. Initialize with locateFile for wasm binary
  throw new Error(
    "No SQLite loader provided. Pass loadSqlite in ProviderConfig or use a bundled version."
  )
}

/**
 * Create a dedicated worker entry point script for the provider.
 *
 * @since 0.1.0
 */
export const createProviderWorkerScript = (config: ProviderConfig): string => {
  return `
// Provider Worker for crsqlite multi-tab
// This script should be customized based on your SQLite WASM loading strategy

const provider = new (${Provider.toString()})(${JSON.stringify(config)});

self.onmessage = async (event) => {
  const request = event.data;
  const response = await provider.handleRequest(request);
  self.postMessage(response);
};

// Initialize on load
provider.initialize().catch(console.error);
`
}
