/**
 * Coordinator Service Worker Tests
 *
 * Tests for the browser multi-tab coordinator fallback that uses Service Worker
 * when SharedWorker is unavailable. The SW coordinator:
 * - Uses the Clients API instead of MessagePorts
 * - Manages provider election via Web Locks (same semantics)
 * - Routes messages between clients and provider
 * - Does NOT touch OPFS (that's the provider's job)
 *
 * @since 0.1.0
 */
import { describe, expect, it, vi, afterEach } from "vitest"
import { ServiceWorkerCoordinator } from "../../src/browser/coordinator-sw.js"

/** Flush all pending microtasks (Promise.resolve callbacks) */
const flushPromises = () => new Promise<void>((resolve) => queueMicrotask(resolve))

/**
 * Mock ServiceWorkerGlobalScope's Client interface
 * In real Service Workers, clients are obtained via self.clients.get(id)
 */
const createMockClient = (id: string) => {
  return {
    id,
    type: "window" as const,
    url: "https://example.com",
    frameType: "top-level" as const,
    postMessage: vi.fn()
  }
}

/**
 * Mock Clients interface (self.clients in Service Worker)
 */
const createMockClientsApi = () => {
  const clientsMap = new Map<string, ReturnType<typeof createMockClient>>()
  return {
    get: vi.fn((id: string) => Promise.resolve(clientsMap.get(id))),
    matchAll: vi.fn(() => Promise.resolve(Array.from(clientsMap.values()))),
    // Test helper to add a mock client
    _addClient: (client: ReturnType<typeof createMockClient>) => {
      clientsMap.set(client.id, client)
    },
    _removeClient: (id: string) => {
      clientsMap.delete(id)
    },
    _getClient: (id: string) => clientsMap.get(id)
  }
}

describe("ServiceWorkerCoordinator Election via Web Locks", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("uses lock name pattern crsqlite:provider:<dbName>", () => {
    const coordinator = new ServiceWorkerCoordinator("test-db")

    // The coordinator uses the same lock name pattern as SharedWorker coordinator
    expect(coordinator.getProviderLockName()).toBe("crsqlite:provider:test-db")
  })

  it("first client to acquire lock becomes provider", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const client1 = createMockClient("client-1")
    const client2 = createMockClient("client-2")
    mockClients._addClient(client1)
    mockClients._addClient(client2)

    // Connect first client
    coordinator.handleClientConnect(client1.id)
    await flushPromises()

    // Simulate first client acquiring the lock and becoming provider
    coordinator.handleMessage(client1.id, { type: "became-provider" })
    await flushPromises()

    // First client is notified they are provider
    expect(client1.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "provider-elected",
        isYou: true
      })
    )

    // Connect second client
    coordinator.handleClientConnect(client2.id)
    await flushPromises()

    // Second client is notified of existing provider
    expect(client2.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "provider-elected",
        isYou: false
      })
    )
  })

  it("only one provider is elected across multiple clients", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const clients = [
      createMockClient("client-1"),
      createMockClient("client-2"),
      createMockClient("client-3")
    ]
    clients.forEach((c) => mockClients._addClient(c))

    // Connect all clients
    clients.forEach((c) => coordinator.handleClientConnect(c.id))
    await flushPromises()

    // First client becomes provider
    coordinator.handleMessage(clients[0].id, { type: "became-provider" })
    await flushPromises()

    // Count provider elections (isYou: true)
    const providerCount = clients.filter((client) =>
      client.postMessage.mock.calls.some(
        (call) => call[0]?.type === "provider-elected" && call[0]?.isYou === true
      )
    ).length

    expect(providerCount).toBe(1)
  })

  it("detects provider death when client disconnects", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const providerClient = createMockClient("provider-client")
    const regularClient = createMockClient("regular-client")
    mockClients._addClient(providerClient)
    mockClients._addClient(regularClient)

    // Setup provider
    coordinator.handleClientConnect(providerClient.id)
    await flushPromises()
    coordinator.handleMessage(providerClient.id, { type: "became-provider" })
    await flushPromises()

    // Setup regular client
    coordinator.handleClientConnect(regularClient.id)
    await flushPromises()

    // Clear previous calls
    regularClient.postMessage.mockClear()

    // Simulate provider disconnect (tab closed)
    coordinator.handleClientDisconnect(providerClient.id)
    await flushPromises()

    // Remaining client is instructed to try becoming provider
    expect(regularClient.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "try-become-provider"
      })
    )
  })

  it("triggers re-election when provider disconnects", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const client1 = createMockClient("client-1")
    const client2 = createMockClient("client-2")
    mockClients._addClient(client1)
    mockClients._addClient(client2)

    // Setup first provider
    coordinator.handleClientConnect(client1.id)
    await flushPromises()
    coordinator.handleMessage(client1.id, { type: "became-provider" })
    await flushPromises()

    // Setup second client
    coordinator.handleClientConnect(client2.id)
    await flushPromises()

    // Provider disconnects
    coordinator.handleClientDisconnect(client1.id)
    await flushPromises()

    // Clear previous calls
    client2.postMessage.mockClear()

    // Second client becomes new provider
    coordinator.handleMessage(client2.id, { type: "became-provider" })
    await flushPromises()

    // Second client is now provider
    expect(client2.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "provider-elected",
        isYou: true
      })
    )
  })
})

describe("ServiceWorkerCoordinator Message Routing", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("tracks clients by their Service Worker client ID", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const client = createMockClient("sw-client-123")
    mockClients._addClient(client)

    coordinator.handleClientConnect(client.id)
    await flushPromises()

    // Client receives connected message with their SW client ID as the clientId
    expect(client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "connected",
        clientId: "sw-client-123"
      })
    )

    expect(coordinator.getClientCount()).toBe(1)
  })

  it("routes requests from client to provider", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const providerClient = createMockClient("provider-client")
    const regularClient = createMockClient("regular-client")
    mockClients._addClient(providerClient)
    mockClients._addClient(regularClient)

    // Setup provider
    coordinator.handleClientConnect(providerClient.id)
    await flushPromises()
    coordinator.handleMessage(providerClient.id, { type: "became-provider" })
    await flushPromises()

    // Setup regular client
    coordinator.handleClientConnect(regularClient.id)
    await flushPromises()

    // Clear previous calls
    providerClient.postMessage.mockClear()

    // Client sends a request
    const request = {
      type: "query",
      requestId: "req-123",
      payload: { sql: "SELECT 1" }
    }
    coordinator.handleMessage(regularClient.id, request)
    await flushPromises()

    // Provider receives forwarded request
    expect(providerClient.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "forward-request",
        clientId: regularClient.id,
        request
      })
    )
  })

  it("routes responses from provider back to client", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const providerClient = createMockClient("provider-client")
    const regularClient = createMockClient("regular-client")
    mockClients._addClient(providerClient)
    mockClients._addClient(regularClient)

    // Setup provider
    coordinator.handleClientConnect(providerClient.id)
    await flushPromises()
    coordinator.handleMessage(providerClient.id, { type: "became-provider" })
    await flushPromises()

    // Setup regular client
    coordinator.handleClientConnect(regularClient.id)
    await flushPromises()

    // Client sends request
    coordinator.handleMessage(regularClient.id, {
      type: "query",
      requestId: "req-456",
      payload: { sql: "SELECT 1" }
    })
    await flushPromises()

    // Clear previous calls to isolate response routing
    regularClient.postMessage.mockClear()

    // Provider sends response
    const response = {
      type: "forward-response",
      clientId: regularClient.id,
      response: {
        type: "result",
        requestId: "req-456",
        payload: { result: { rows: [[1]] } }
      }
    }
    coordinator.handleMessage(providerClient.id, response)
    await flushPromises()

    // Client receives the response
    expect(regularClient.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "result",
        requestId: "req-456"
      })
    )
  })

  it("cleans up client resources on disconnect", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const client = createMockClient("sw-client-789")
    mockClients._addClient(client)

    coordinator.handleClientConnect(client.id)
    expect(coordinator.getClientCount()).toBe(1)

    coordinator.handleClientDisconnect(client.id)
    expect(coordinator.getClientCount()).toBe(0)
  })

  it("broadcasts db_version notifications to all clients", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const providerClient = createMockClient("provider-client")
    const client1 = createMockClient("client-1")
    const client2 = createMockClient("client-2")
    mockClients._addClient(providerClient)
    mockClients._addClient(client1)
    mockClients._addClient(client2)

    // Setup provider and clients
    coordinator.handleClientConnect(providerClient.id)
    await flushPromises()
    coordinator.handleMessage(providerClient.id, { type: "became-provider" })
    await flushPromises()
    coordinator.handleClientConnect(client1.id)
    await flushPromises()
    coordinator.handleClientConnect(client2.id)
    await flushPromises()

    // Clear previous calls
    client1.postMessage.mockClear()
    client2.postMessage.mockClear()

    // Provider broadcasts a db_version notification
    const notification = {
      type: "db-version-changed",
      dbName: "default",
      dbVersion: 42
    }
    coordinator.handleMessage(providerClient.id, {
      type: "broadcast",
      message: notification
    })
    await flushPromises()

    // All clients (except provider) receive the notification
    expect(client1.postMessage).toHaveBeenCalledWith(notification)
    expect(client2.postMessage).toHaveBeenCalledWith(notification)
  })
})

describe("ServiceWorkerCoordinator Lifecycle", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("handles message event from Service Worker message handler", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const client = createMockClient("sw-client")
    mockClients._addClient(client)

    // Simulate the Service Worker message event structure
    const event = {
      source: { id: client.id },
      data: { type: "register" }
    }

    // The coordinator can process SW message events
    coordinator.handleMessageEvent(event)
    await flushPromises()

    // Client is now tracked
    expect(coordinator.getClientCount()).toBe(1)
  })

  it("queues requests when no provider is available", async () => {
    const mockClients = createMockClientsApi()
    const coordinator = new ServiceWorkerCoordinator("default", mockClients)

    const client = createMockClient("client-waiting")
    mockClients._addClient(client)

    coordinator.handleClientConnect(client.id)
    await flushPromises()

    // Send request before any provider is elected
    coordinator.handleMessage(client.id, {
      type: "query",
      requestId: "req-pending",
      payload: { sql: "SELECT 1" }
    })
    await flushPromises()

    // No provider yet, request should be queued
    // Now elect a provider
    const providerClient = createMockClient("provider-client")
    mockClients._addClient(providerClient)
    coordinator.handleClientConnect(providerClient.id)
    await flushPromises()
    coordinator.handleMessage(providerClient.id, { type: "became-provider" })
    await flushPromises()

    // Provider receives the pending request
    expect(providerClient.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "forward-request",
        clientId: client.id
      })
    )
  })
})
