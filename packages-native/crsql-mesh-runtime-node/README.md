# @effect-native/crsql-mesh-runtime-node

Node.js runtime adapter for CR-SQLite mesh synchronization.

## Overview

This package provides a runtime layer that wires platform capabilities (filesystem persistence and process lifecycle) into the mesh engine for Node.js, Bun, and Deno environments.

## Installation

```bash
pnpm add @effect-native/crsql-mesh-runtime-node
```

## Usage

```typescript
import * as NodeRuntime from "@effect-native/crsql-mesh-runtime-node/NodeRuntime"
import { Effect, Layer } from "effect"

const runtime = NodeRuntime.NodeRuntimeLive({
  databasePath: "./data/mesh.db",
  shutdownTimeout: "10 seconds"
})

// Use with Effect.scoped to manage lifecycle
const program = Effect.scoped(
  Layer.build(runtime).pipe(
    Effect.flatMap(() => {
      // Your mesh sync application logic here
      return Effect.succeed("Mesh runtime initialized")
    })
  )
)
```

## Configuration

| Field | Type | Description |
| --- | --- | --- |
| `databasePath` | `string` | Path to the SQLite database file used for persistence |
| `shutdownTimeout` | `Duration.DurationInput` | Maximum time allowed to stop sync and close the database cleanly |

## Error Types

- `DatabasePathInvalid` - Provided database path cannot be used for persistence
- `ShutdownTimeout` - Shutdown exceeded the configured timeout

## License

MIT
