/**
 * Service Worker Coordinator for Multi-tab Database Access
 *
 * Fallback coordinator when SharedWorker is unavailable.
 * Uses the Service Worker Clients API instead of MessagePorts.
 *
 * The coordinator routes database requests between browser tabs:
 * 1. Tracks connected clients via Service Worker client IDs
 * 2. Elects one tab as the "provider" (database owner) using Web Locks
 * 3. Routes requests from client tabs to the provider
 * 4. Handles provider failover when a tab closes
 *
 * Lock name pattern: `crsqlite:provider:<dbName>`
 *
 * IMPORTANT: The Service Worker coordinator does NOT touch OPFS.
 * It only does port bridging / message routing. The provider's
 * dedicated Worker owns the OPFS database connection.
 *
 * @since 0.1.0
 */

import type {
  ClientId,
  ProviderId,
  ConnectedMessage,
  ProviderElectedMessage,
  TryBecomeProviderMessage,
  ForwardRequestMessage,
  ForwardResponseMessage
} from "./coordinator.js"

export type { ClientId, ProviderId }

/** Service Worker client interface (subset of WindowClient) */
interface ServiceWorkerClient {
  readonly id: string
  postMessage(message: unknown): void
}

/** Service Worker Clients API interface */
interface ServiceWorkerClientsApi {
  get(id: string): Promise<ServiceWorkerClient | undefined>
  matchAll(): Promise<ReadonlyArray<ServiceWorkerClient>>
}

/** Client state tracked by the coordinator */
interface ClientState {
  readonly clientId: ClientId
  isProvider: boolean
}

/**
 * Service Worker Coordinator class for managing multi-tab database access.
 *
 * This is a fallback implementation for environments where SharedWorker
 * is unavailable (e.g., some mobile browsers). It provides the same
 * election and routing semantics as the SharedWorker coordinator.
 *
 * Key differences from SharedWorker coordinator:
 * - Uses Service Worker Clients API instead of MessagePorts
 * - Messages sent via client.postMessage() instead of port.postMessage()
 * - Client tracking uses client.id from the Clients API
 *
 * @since 0.1.0
 */
export class ServiceWorkerCoordinator {
  private readonly clients = new Map<ClientId, ClientState>()
  private currentProviderId: ClientId | null = null
  private readonly dbName: string
  private readonly pendingRequests: Array<{ clientId: ClientId; request: unknown }> = []
  private readonly swClients: ServiceWorkerClientsApi

  constructor(dbName = "default", swClients?: ServiceWorkerClientsApi) {
    this.dbName = dbName
    // In real SW context, this would be self.clients
    // For testing, allow injection of mock clients API
    this.swClients = swClients ?? (globalThis as unknown as { clients: ServiceWorkerClientsApi }).clients
  }

  /**
   * Handle a new client connection.
   * In Service Worker, clients identify themselves by their client.id.
   * Assigns the SW client ID as the clientId and notifies the client.
   */
  handleClientConnect(swClientId: string): void {
    // In SW, we use the SW client ID directly as the clientId
    const clientId = swClientId

    const state: ClientState = {
      clientId,
      isProvider: false
    }

    this.clients.set(clientId, state)

    // Notify client of their assigned ID
    this.sendToClient(clientId, { type: "connected", clientId } satisfies ConnectedMessage)

    // If there's already a provider, notify this client about it
    if (this.currentProviderId) {
      this.sendToClient(clientId, {
        type: "provider-elected",
        providerId: this.currentProviderId,
        isYou: false
      } satisfies ProviderElectedMessage)
    } else {
      // No provider yet, ask this client to try becoming provider
      this.sendToClient(clientId, { type: "try-become-provider" } satisfies TryBecomeProviderMessage)
    }
  }

  /**
   * Handle a message from a connected client.
   * Routes the message based on its type.
   */
  handleMessage(clientId: ClientId, message: unknown): void {
    if (!this.clients.has(clientId)) {
      return // Unknown client
    }

    const msg = message as { type?: string }

    switch (msg.type) {
      case "register":
        // Client is registering - treat same as connect
        if (!this.clients.has(clientId)) {
          this.handleClientConnect(clientId)
        }
        break

      case "disconnect":
        this.handleClientDisconnect(clientId)
        break

      case "became-provider":
        this.electProvider(clientId)
        break

      case "forward-response":
        this.handleProviderResponse(msg as ForwardResponseMessage)
        break

      case "broadcast":
        // Provider is broadcasting a message to all clients
        this.handleBroadcast(clientId, (msg as { message: unknown }).message)
        break

      default:
        // Treat as an RPC request to forward to provider
        this.forwardRequestToProvider(clientId, message)
        break
    }
  }

  /**
   * Handle a Service Worker message event.
   * This is the entry point for the SW 'message' event handler.
   */
  handleMessageEvent(event: { source?: { id?: string }; data: unknown }): void {
    const clientId = event.source?.id
    if (!clientId) {
      return
    }

    // Auto-register client on first message if not already connected
    if (!this.clients.has(clientId)) {
      this.handleClientConnect(clientId)
    }

    this.handleMessage(clientId, event.data)
  }

  /**
   * Handle client disconnection.
   * Removes the client and triggers re-election if they were the provider.
   */
  handleClientDisconnect(clientId: ClientId): void {
    const client = this.clients.get(clientId)
    if (!client) {
      return
    }

    const wasProvider = client.isProvider

    // Remove client
    this.clients.delete(clientId)

    // If provider disconnected, trigger re-election
    if (wasProvider) {
      this.currentProviderId = null

      // Ask remaining clients to try becoming provider
      for (const [id] of this.clients) {
        this.sendToClient(id, { type: "try-become-provider" } satisfies TryBecomeProviderMessage)
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
    for (const [id] of this.clients) {
      this.sendToClient(id, {
        type: "provider-elected",
        providerId: clientId,
        isYou: id === clientId
      } satisfies ProviderElectedMessage)
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

    const forwardMsg: ForwardRequestMessage = {
      type: "forward-request",
      clientId,
      request
    }

    this.sendToClient(this.currentProviderId, forwardMsg)
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
    this.sendToClient(msg.clientId, msg.response)
  }

  /**
   * Handle a broadcast message from the provider.
   * Sends the message to all clients except the provider.
   */
  private handleBroadcast(fromClientId: ClientId, message: unknown): void {
    // Only the provider can broadcast
    if (fromClientId !== this.currentProviderId) {
      return
    }

    // Send to all clients except the provider
    for (const [id] of this.clients) {
      if (id !== this.currentProviderId) {
        this.sendToClient(id, message)
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
   * Send a message to a client via the Service Worker Clients API.
   */
  private sendToClient(clientId: ClientId, message: unknown): void {
    this.swClients.get(clientId).then((client) => {
      if (client) {
        client.postMessage(message)
      }
    })
  }

  /**
   * Get the number of connected clients.
   */
  getClientCount(): number {
    return this.clients.size
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
 * Create a Service Worker entry point script.
 * This is used to bootstrap the coordinator in a Service Worker context.
 *
 * @since 0.1.0
 */
export const createServiceWorkerScript = (dbName = "default"): string => {
  return `
// Service Worker Coordinator for crsqlite multi-tab
const coordinator = new (${ServiceWorkerCoordinator.toString()})("${dbName}", self.clients);

self.addEventListener('message', (event) => {
  coordinator.handleMessageEvent(event);
});

// Handle client disconnect via controllerchange or client going away
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
`
}
