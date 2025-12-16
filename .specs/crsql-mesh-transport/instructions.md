> **Note:** This spec directory is now reference material.
> The primary spec is the unified product spec at `effect-native/.specs/crsql-mesh/`.
> Package boundaries are deferred until they block progress (see `research/thing-golf.md`).

---

# Instructions: `@effect-native/crsql-mesh-transport`

## Context

The CR-SQLite global mesh architecture requires peers to exchange change data across many different communication channels. Today, there is no unified abstraction for these channels — every sync implementation would need to hardcode its transport logic, creating tight coupling between the sync engine and the specific networking mechanism.

This creates several problems:
- The sync engine cannot be reused across different deployment contexts (browser tabs, server processes, mobile apps, edge devices)
- Testing sync behavior requires spinning up real network infrastructure
- Adding new transport types requires modifying the core sync logic
- Different platforms have different "native" transports (browsers have BroadcastChannel, servers have IPC, mobile has Bluetooth/Multipeer)

A transport adapter abstraction decouples "how bytes move" from "what the bytes mean", allowing the sync engine to remain transport-agnostic.

## User Story

As a **developer building a local-first application**, I want **pluggable transport adapters**, so that **my sync engine works across browsers, servers, and mobile devices without modification**.

As a **developer writing sync tests**, I want **in-memory or mock transports**, so that **I can test sync behavior without network dependencies**.

As a **platform maintainer**, I want **to add new transport types (LAN discovery, Bluetooth, custom protocols)**, so that **sync can leverage platform-native communication without changing the core engine**.

## High-Level Goals

- Define a minimal interface that transports must satisfy to work with the sync engine
- Support both point-to-point messaging (send to specific peer) and broadcast messaging (send to all reachable peers)
- Enable transports to be composed or swapped at runtime
- Allow transport-agnostic testing of sync logic
- Support the following transport categories (without mandating specific implementations):
  - **Same-process**: direct function calls, message queues between threads/workers
  - **Same-origin browser**: BroadcastChannel for tab-to-tab communication
  - **Network**: WebSocket connections to relay servers
  - **Peer-to-peer**: WebRTC data channels for direct peer connections
  - **Local network**: UDP multicast, mDNS discovery with TCP connections
  - **Platform-native**: Bluetooth, iOS Multipeer Connectivity, Android nearby connections
  - **IPC**: Unix domain sockets, named pipes for same-machine processes

## Out of Scope

- **Specific transport implementations**: This package defines the interface, not WebSocket clients or WebRTC signaling
- **Discovery/peer enumeration**: How peers find each other is transport-specific, not part of this interface
- **Authentication/encryption**: Security is handled at the transport layer or above, not in the interface definition
- **Message framing/serialization**: The interface deals with opaque byte payloads; framing is the transport's job
- **Connection management**: Reconnection, keepalives, and connection lifecycle are transport-specific concerns
- **Routing/relay logic**: Multi-hop message routing is either built into specific transports or handled by a higher layer
- **Bandwidth management/QoS**: Rate limiting, prioritization, and flow control are transport implementation details
