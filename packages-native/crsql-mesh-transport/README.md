# @effect-native/crsql-mesh-transport

Transport abstraction for CR-SQLite mesh synchronization.

## Overview

This package provides a minimal transport abstraction for moving opaque bytes between peers, without coupling the mesh engine to any particular communication mechanism.

## Installation

```bash
pnpm add @effect-native/crsql-mesh-transport
```

## Usage

```typescript
import { Transport, InMemoryTransport } from "@effect-native/crsql-mesh-transport"
import * as Effect from "effect/Effect"

// Create an in-memory mesh for testing
const mesh = InMemoryTransport.createMesh()
const peerA = mesh.createPeer("00000000000000000000000000000001")
const peerB = mesh.createPeer("00000000000000000000000000000002")

// Open transports
await Effect.runPromise(peerA.open)
await Effect.runPromise(peerB.open)

// Send message from A to B
await Effect.runPromise(peerA.send({
  to: "00000000000000000000000000000002",
  payload: new Uint8Array([1, 2, 3])
}))

// Flush to deliver
mesh.flush()
```

## License

MIT
