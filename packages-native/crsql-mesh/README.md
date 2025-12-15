# @effect-native/crsql-mesh

Transport-agnostic synchronization engine for CR-SQLite mesh networks.

## Overview

This package provides the orchestration layer for synchronizing CR-SQLite databases across a mesh of peers. It handles:

- Version vector comparison and diff computation
- Periodic summary exchange between peers
- Transactional application of incoming changes
- Progress observation for UI refresh patterns

## Installation

```bash
pnpm add @effect-native/crsql-mesh
```

## Usage

```typescript
import { Mesh, MeshConfig } from "@effect-native/crsql-mesh"
import { InMemoryTransport } from "@effect-native/crsql-mesh-transport"
import { Effect, Layer } from "effect"

// Configure the mesh
const config: MeshConfig = {
  syncInterval: 5000 // ms
}

// Create the mesh layer with your transport and database
const MeshLayer = Mesh.layer.pipe(
  Layer.provide(/* your Transport layer */),
  Layer.provide(/* your CrSql layer */)
)

// Run synchronization
const program = Effect.gen(function*() {
  const mesh = yield* Mesh
  yield* mesh.run // runs until scope closes
})
```

## License

MIT
