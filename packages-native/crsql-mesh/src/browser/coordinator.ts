/**
 * Coordinator SharedWorker for Multi-tab Database Access
 *
 * The coordinator routes database requests between browser tabs:
 * 1. Accepts connections from multiple tabs
 * 2. Elects one tab as the "provider" (database owner) using Web Locks
 * 3. Routes requests from client tabs to the provider
 * 4. Handles provider failover when a tab closes
 *
 * Lock name pattern: `crsqlite:provider:<dbName>`
 *
 * @since 0.1.0
 */

/** Unique client identifier */
export type ClientId = string

/** Provider identifier (same as ClientId for the elected provider) */
export type ProviderId = string

/** Connected message sent when client first connects */
export interface ConnectedMessage {
  readonly type: "connected"
  readonly clientId: ClientId
}

/** Provider elected notification */
export interface ProviderElectedMessage {
  readonly type: "provider-elected"
  readonly providerId: ProviderId
  readonly isYou: boolean
}

/** Try become provider message */
export interface TryBecomeProviderMessage {
  readonly type: "try-become-provider"
}

/** Forward request from client to provider */
export interface ForwardRequestMessage {
  readonly type: "forward-request"
  readonly clientId: ClientId
  readonly request: unknown
}

/** Forward response from provider to client */
export interface ForwardResponseMessage {
  readonly type: "forward-response"
  readonly clientId: ClientId
  readonly response: unknown
}

/** Became provider message from client */
export interface BecameProviderMessage {
  readonly type: "became-provider"
}

/** Disconnect message from client */
export interface DisconnectMessage {
  readonly type: "disconnect"
}

/** db_version changed notification from provider */
export interface DbVersionChangedMessage {
  readonly type: "db-version-changed"
  readonly dbName: string
  readonly dbVersion: number
}

/** RPC request message */
export interface RpcRequestMessage {
  readonly type: string
  readonly requestId: string
  readonly payload?: unknown
}

/** RPC response message */
export interface RpcResponseMessage {
  readonly type: "result" | "error"
  readonly requestId: string
  readonly payload?: unknown
}

/** Client connection state */
interface ClientConnection {
  readonly port: MessagePort
  readonly clientId: ClientId
  isProvider: boolean
}

/** Generate a unique client ID */
const generateClientId = (): ClientId => {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Simple fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Coordinator class for managing multi-tab database access.
 *
 * This class implements the coordinator role described in the Browser Multi-Tab design:
 * - Manages MessagePorts for all connected clients
 * - Tracks which client is the current provider
 * - Routes requests from clients to the provider
 * - Handles provider election and failover
 *
 * @since 0.1.0
 */
export class Coordinator {
  private readonly clients = new Map<ClientId, ClientConnection>()
  /** @internal */
  readonly portToClientId = new Map<MessagePort, ClientId>()
  private currentProviderId: ClientId | null = null
  private readonly dbName: string
  private readonly pendingRequests: Array<{ clientId: ClientId; request: unknown }> = []

  constructor(dbName = "default") {
    this.dbName = dbName
  }

  /**
   * Handle a new client connection.
   * Assigns a unique clientId and notifies the client.
   * If no provider exists, instructs the client to try becoming provider.
   */
  handleConnection(port: MessagePort): void {
    const clientId = generateClientId()

    const connection: ClientConnection = {
      port,
      clientId,
      isProvider: false
    }

    this.clients.set(clientId, connection)
    this.portToClientId.set(port, clientId)

    // Notify client of their assigned ID
    const connectedMsg: ConnectedMessage = { type: "connected", clientId }
    port.postMessage(connectedMsg)

    // If there's already a provider, notify this client about it
    if (this.currentProviderId) {
      const notification: ProviderElectedMessage = {
        type: "provider-elected",
        providerId: this.currentProviderId,
        isYou: false
      }
      port.postMessage(notification)
    } else {
      // No provider yet, ask this client to try becoming provider
      const tryMsg: TryBecomeProviderMessage = { type: "try-become-provider" }
      port.postMessage(tryMsg)
    }
  }

  /**
   * Handle a message from a connected client.
   * Routes the message based on its type.
   */
  handleMessage(port: MessagePort, message: unknown): void {
    const clientId = this.portToClientId.get(port)
    if (!clientId) {
      return // Unknown port
    }

    const msg = message as { type?: string }

    switch (msg.type) {
      case "disconnect":
        this.handleDisconnect(port)
        break

      case "became-provider":
        this.electProvider(clientId)
        break

      case "forward-response":
        this.handleProviderResponse(msg as ForwardResponseMessage)
        break

      case "db-version-changed":
        this.handleDbVersionChanged(clientId, msg as DbVersionChangedMessage)
        break

      default:
        // Treat as an RPC request to forward to provider
        this.forwardRequestToProvider(clientId, message)
        break
    }
  }

  /**
   * Handle client disconnection.
   * Removes the client and triggers re-election if they were the provider.
   */
  handleDisconnect(port: MessagePort): void {
    const clientId = this.portToClientId.get(port)
    if (!clientId) {
      return
    }

    const client = this.clients.get(clientId)
    const wasProvider = client?.isProvider ?? false

    // Remove client
    this.clients.delete(clientId)
    this.portToClientId.delete(port)

    // If provider disconnected, trigger re-election
    if (wasProvider) {
      this.currentProviderId = null

      // Ask remaining clients to try becoming provider
      for (const [, conn] of this.clients) {
        const tryMsg: TryBecomeProviderMessage = { type: "try-become-provider" }
        conn.port.postMessage(tryMsg)
        break // Only need to trigger one - others will fail ifAvailable
      }
    }
  }

  /**
   * Elect a client as the database provider.
   * Updates internal state and notifies all connected clients.
   */
  private electProvider(clientId: ClientId): void {
    const client = this.clients.get(clientId)
    if (!client) {
      return
    }

    this.currentProviderId = clientId
    client.isProvider = true

    // Notify all clients of the new provider
    for (const [id, conn] of this.clients) {
      const notification: ProviderElectedMessage = {
        type: "provider-elected",
        providerId: clientId,
        isYou: id === clientId
      }
      conn.port.postMessage(notification)
    }

    // Process any pending requests that were waiting for a provider
    this.processPendingRequests()
  }

  /**
   * Forward a request from a client to the provider.
   * If no provider is available, queues the request.
   */
  private forwardRequestToProvider(clientId: ClientId, request: unknown): void {
    if (!this.currentProviderId) {
      // No provider yet - queue the request
      this.pendingRequests.push({ clientId, request })
      return
    }

    if (clientId === this.currentProviderId) {
      // Provider shouldn't be sending requests to itself through coordinator
      return
    }

    const provider = this.clients.get(this.currentProviderId)
    if (!provider) {
      return
    }

    const forwardMsg: ForwardRequestMessage = {
      type: "forward-request",
      clientId,
      request
    }

    provider.port.postMessage(forwardMsg)
  }

  /**
   * Handle a response from the provider, routing it back to the original client.
   */
  private handleProviderResponse(msg: ForwardResponseMessage): void {
    const client = this.clients.get(msg.clientId)
    if (!client) {
      return
    }

    // Forward the response to the requesting client
    client.port.postMessage(msg.response)
  }

  /**
   * Handle db_version change notification from provider.
   * Broadcasts to all non-provider clients.
   */
  private handleDbVersionChanged(senderId: ClientId, msg: DbVersionChangedMessage): void {
    // Only accept notifications from the current provider
    if (senderId !== this.currentProviderId) {
      return
    }

    // Broadcast to all clients except the provider
    for (const [clientId, conn] of this.clients) {
      if (clientId !== this.currentProviderId) {
        conn.port.postMessage(msg)
      }
    }
  }

  /**
   * Process requests that were queued while waiting for a provider.
   */
  private processPendingRequests(): void {
    while (this.pendingRequests.length > 0) {
      const pending = this.pendingRequests.shift()
      if (pending) {
        this.forwardRequestToProvider(pending.clientId, pending.request)
      }
    }
  }

  /**
   * Get the number of connected clients.
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Get a client by ID.
   */
  getClient(clientId: ClientId): ClientConnection | undefined {
    return this.clients.get(clientId)
  }

  /**
   * Get the current provider ID.
   */
  getProviderId(): ClientId | null {
    return this.currentProviderId
  }

  /**
   * Get the lock name for provider election.
   */
  getProviderLockName(): string {
    return `crsqlite:provider:${this.dbName}`
  }
}

/**
 * Create a SharedWorker entry point script.
 * This is used to bootstrap the coordinator in a SharedWorker context.
 *
 * @since 0.1.0
 */
export const createSharedWorkerScript = (dbName = "default"): string => {
  return `
// SharedWorker Coordinator for crsqlite multi-tab
const coordinator = new (${Coordinator.toString()})("${dbName}");

self.onconnect = (event) => {
  const port = event.ports[0];
  coordinator.handleConnection(port);
  
  port.onmessage = (msg) => {
    coordinator.handleMessage(port, msg.data);
  };
  
  port.onmessageerror = () => {
    coordinator.handleDisconnect(port);
  };
  
  port.start();
};
`
}
