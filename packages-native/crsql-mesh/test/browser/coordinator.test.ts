/**
 * Coordinator SharedWorker Tests
 *
 * Tests for the browser multi-tab coordinator that manages:
 * - Provider election via Web Locks
 * - MessagePort routing between clients and provider
 * - Provider death detection and re-election
 *
 * @since 0.1.0
 */
import { describe, expect, it, vi, afterEach } from "vitest"
import { Coordinator } from "../../src/browser/coordinator.js"

// Mock MessagePort
const createMockMessagePort = () => {
  const handlers: Array<(event: { data: unknown }) => void> = []
  return {
    postMessage: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
    onmessage: null as ((event: { data: unknown }) => void) | null,
    onmessageerror: null as (() => void) | null,
    addEventListener: vi.fn((event: string, handler: (event: { data: unknown }) => void) => {
      if (event === "message") handlers.push(handler)
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    // Test helper to simulate incoming message
    _receive: (data: unknown) => {
      if (handlers.length > 0) handlers.forEach((h) => h({ data }))
    }
  }
}

describe("Coordinator Election via Web Locks", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("uses lock name pattern crsqlite:provider:<dbName>", () => {
    const coordinator = new Coordinator("test-db")

    // The coordinator should use lock name pattern crsqlite:provider:<dbName>
    expect(coordinator.getProviderLockName()).toBe("crsqlite:provider:test-db")
  })

  it("first client to acquire lock becomes provider", () => {
    const coordinator = new Coordinator()
    const port1 = createMockMessagePort()
    const port2 = createMockMessagePort()

    // Connect first client
    coordinator.handleConnection(port1 as unknown as MessagePort)

    // Simulate first client acquiring the lock and becoming provider
    coordinator.handleMessage(port1 as unknown as MessagePort, {
      type: "became-provider"
    })

    // First client should be notified they are provider
    expect(port1.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "provider-elected",
        isYou: true
      })
    )

    // Connect second client
    coordinator.handleConnection(port2 as unknown as MessagePort)

    // Second client should be notified of existing provider
    expect(port2.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "provider-elected",
        isYou: false
      })
    )
  })

  it("only one provider is elected across multiple clients", () => {
    const coordinator = new Coordinator()
    const ports = [createMockMessagePort(), createMockMessagePort(), createMockMessagePort()]

    // Connect all clients
    ports.forEach((port) => coordinator.handleConnection(port as unknown as MessagePort))

    // First client becomes provider
    coordinator.handleMessage(ports[0] as unknown as MessagePort, {
      type: "became-provider"
    })

    // Count provider elections (isYou: true)
    const providerCount = ports.filter((port) =>
      port.postMessage.mock.calls.some(
        (call) => call[0]?.type === "provider-elected" && call[0]?.isYou === true
      )
    ).length

    expect(providerCount).toBe(1)
  })

  it("detects provider death when MessagePort disconnects", () => {
    const coordinator = new Coordinator()
    const providerPort = createMockMessagePort()
    const clientPort = createMockMessagePort()

    // Setup provider
    coordinator.handleConnection(providerPort as unknown as MessagePort)
    coordinator.handleMessage(providerPort as unknown as MessagePort, {
      type: "became-provider"
    })

    // Setup client
    coordinator.handleConnection(clientPort as unknown as MessagePort)

    // Clear previous calls
    clientPort.postMessage.mockClear()

    // Simulate provider disconnect
    coordinator.handleDisconnect(providerPort as unknown as MessagePort)

    // Client should be instructed to try becoming provider
    expect(clientPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "try-become-provider"
      })
    )
  })

  it("triggers re-election when provider disconnects", () => {
    const coordinator = new Coordinator()
    const port1 = createMockMessagePort()
    const port2 = createMockMessagePort()

    // Setup first provider
    coordinator.handleConnection(port1 as unknown as MessagePort)
    coordinator.handleMessage(port1 as unknown as MessagePort, { type: "became-provider" })

    // Setup second client
    coordinator.handleConnection(port2 as unknown as MessagePort)

    // Provider disconnects
    coordinator.handleDisconnect(port1 as unknown as MessagePort)

    // Clear previous calls
    port2.postMessage.mockClear()

    // Second client becomes new provider
    coordinator.handleMessage(port2 as unknown as MessagePort, { type: "became-provider" })

    // Second client should now be provider
    expect(port2.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "provider-elected",
        isYou: true
      })
    )
  })
})

describe("Coordinator MessagePort Routing", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("assigns unique clientId to each connection", () => {
    const coordinator = new Coordinator()
    const port1 = createMockMessagePort()
    const port2 = createMockMessagePort()

    coordinator.handleConnection(port1 as unknown as MessagePort)
    coordinator.handleConnection(port2 as unknown as MessagePort)

    // Each port should receive a connected message with unique clientId
    const clientId1 = port1.postMessage.mock.calls.find((call) => call[0]?.type === "connected")?.[0]
      ?.clientId
    const clientId2 = port2.postMessage.mock.calls.find((call) => call[0]?.type === "connected")?.[0]
      ?.clientId

    expect(clientId1).toBeDefined()
    expect(clientId2).toBeDefined()
    expect(clientId1).not.toBe(clientId2)
  })

  it("routes requests from client to provider", () => {
    const coordinator = new Coordinator()
    const providerPort = createMockMessagePort()
    const clientPort = createMockMessagePort()

    // Setup provider
    coordinator.handleConnection(providerPort as unknown as MessagePort)
    coordinator.handleMessage(providerPort as unknown as MessagePort, { type: "became-provider" })

    // Setup client
    coordinator.handleConnection(clientPort as unknown as MessagePort)

    // Get client ID
    const clientId = clientPort.postMessage.mock.calls.find(
      (call) => call[0]?.type === "connected"
    )?.[0]?.clientId

    // Clear previous calls
    providerPort.postMessage.mockClear()

    // Client sends a request
    const request = {
      type: "query",
      requestId: "req-123",
      payload: { sql: "SELECT 1" }
    }
    coordinator.handleMessage(clientPort as unknown as MessagePort, request)

    // Provider should receive forwarded request
    expect(providerPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "forward-request",
        clientId,
        request
      })
    )
  })

  it("routes responses from provider back to client", () => {
    const coordinator = new Coordinator()
    const providerPort = createMockMessagePort()
    const clientPort = createMockMessagePort()

    // Setup provider
    coordinator.handleConnection(providerPort as unknown as MessagePort)
    coordinator.handleMessage(providerPort as unknown as MessagePort, { type: "became-provider" })

    // Setup client
    coordinator.handleConnection(clientPort as unknown as MessagePort)

    const clientId = clientPort.postMessage.mock.calls.find(
      (call) => call[0]?.type === "connected"
    )?.[0]?.clientId

    // Client sends request
    coordinator.handleMessage(clientPort as unknown as MessagePort, {
      type: "query",
      requestId: "req-456",
      payload: { sql: "SELECT 1" }
    })

    // Clear previous calls to isolate response routing
    clientPort.postMessage.mockClear()

    // Provider sends response
    const response = {
      type: "forward-response",
      clientId,
      response: {
        type: "result",
        requestId: "req-456",
        payload: { result: { rows: [[1]] } }
      }
    }
    coordinator.handleMessage(providerPort as unknown as MessagePort, response)

    // Client should receive the response
    expect(clientPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "result",
        requestId: "req-456"
      })
    )
  })

  it("cleans up client resources on disconnect", () => {
    const coordinator = new Coordinator()
    const port = createMockMessagePort()

    coordinator.handleConnection(port as unknown as MessagePort)

    const clientId = port.postMessage.mock.calls.find((call) => call[0]?.type === "connected")?.[0]
      ?.clientId

    expect(coordinator.getClientCount()).toBe(1)

    coordinator.handleDisconnect(port as unknown as MessagePort)

    expect(coordinator.getClientCount()).toBe(0)
    expect(coordinator.getClient(clientId)).toBeUndefined()
  })
})
