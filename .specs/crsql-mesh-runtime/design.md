# crsql-mesh-runtime-node — Phase 3: Design

## Purpose

Define a Node.js runtime adapter that wires platform capabilities (filesystem persistence and process lifecycle) into the mesh engine.

This runtime does not define network transports; it provides a database connection and lifecycle integration suitable for running mesh sync.

## Inputs / Dependencies

- `@effect/platform` capabilities for filesystem access and process lifecycle.
- `@effect-native/crsql` for SQLite + CR-SQLite integration.
- `@effect-native/crsql-mesh` engine.
- `@effect-native/crsql-mesh-protocol` for protocol initialization (including `unhex()` check).

## Design Constraints

- Runtime responsibilities stay narrow (provide DB + lifecycle wiring).
- Runtime does not select transports or topology.
- Shutdown is driven by structured concurrency (scope closure), not global mutable flags.

## Configuration Model

| Field | Meaning |
| --- | --- |
| `databasePath` | Path to the SQLite database file used for persistence. |
| `shutdownTimeout` | Maximum time allowed to stop sync and close the database cleanly. |

No default values are required by this design; callers may provide their own defaults.

## Module Architecture

Suggested layout:

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Re-exports public surface. |
| `src/NodeRuntime.ts` | Config model + `NodeRuntimeLive` layer constructor. |
| `src/NodeRuntimeError.ts` | `DatabasePathInvalid`, `ShutdownTimeout` error types. |
| `src/internal/database.ts` | DB open, CR-SQLite extension loading, and close. |
| `src/internal/lifecycle.ts` | Signal handling and shutdown orchestration. |

## Provided Capabilities

### Database connection

- Open a SQLite database located at `databasePath`.
- Load the CR-SQLite extension.
- Ensure protocol initialization succeeded (including `unhex()` availability).
- Provide the database connection service required by the mesh engine.

### Process lifecycle

On process termination signals (SIGTERM, SIGINT):

- Stop mesh background fibers.
- Close the database connection.
- Enforce `shutdownTimeout`.

## Layering Strategy

- Export a single “live” runtime layer (`NodeRuntimeLive`) implemented as `Layer.scoped`.
- The layer acquisition:
  - Validates configuration
  - Initializes protocol
  - Opens the database connection
  - Starts mesh work only if the caller composes the mesh layer
- The layer finalizer:
  - Ensures database close
  - Ensures lifecycle hooks are removed

Note: The runtime is intended to be composed with `crsql-mesh-transport` and `crsql-mesh` rather than bundling those decisions.

## Error Handling Strategy

| Error | Meaning | Recovery |
| --- | --- | --- |
| `DatabasePathInvalid` | Provided `databasePath` cannot be used for persistence | Caller fixes configuration or filesystem permissions. |
| `ShutdownTimeout` | Shutdown exceeded `shutdownTimeout` | Caller increases timeout or reduces shutdown work. |

The runtime propagates `UnhexUnavailable` from the protocol layer without fallback.

## Test Strategy

### Unit tests (config + layer wiring)

- Invalid `databasePath` fails with `DatabasePathInvalid`.
- Protocol initialization is required and `UnhexUnavailable` fails the runtime.

### Integration tests (process lifecycle)

- Compose the runtime layer with an in-memory transport and a minimal mesh.
- Simulate shutdown (or invoke the shutdown path directly) and assert:
  - mesh fibers stop
  - database closes
  - timeout enforcement behaves as specified

## Out of Scope

- Browser and React Native runtimes.
- Worker thread / multi-thread coordination.
- Cluster/multi-process orchestration.
- Bun-specific behavior guarantees.
- Transport implementations and peer discovery.
