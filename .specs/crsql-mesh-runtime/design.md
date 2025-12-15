# crsql-mesh-runtime-node — Phase 3: Design

## Purpose

Define a Node.js runtime adapter that wires platform capabilities (filesystem persistence and process lifecycle) into the mesh engine.

This runtime does not define network transports; it provides a database connection and lifecycle integration suitable for running mesh sync.

## Dependencies

- `@effect/platform` capabilities for filesystem and process lifecycle.
- `@effect-native/crsql` for SQLite + CR-SQLite integration.
- `@effect-native/crsql-mesh` engine.
- `@effect-native/crsql-mesh-protocol` for protocol initialization (including `unhex()` check).

## Configuration Model

| Field | Meaning |
| --- | --- |
| `databasePath` | Path to the SQLite database file used for persistence. |
| `shutdownTimeout` | Maximum time allowed to stop sync and close the database cleanly. |

No default values are required by this design; callers may provide their own defaults.

## Provided Capabilities

### Database connection

- Open a SQLite database located at `databasePath`.
- Load the CR-SQLite extension.
- Ensure protocol initialization succeeded (including `unhex()` availability).

### Process lifecycle

On process termination signals:

- Stop the mesh sync loop.
- Close the database connection.
- Enforce `shutdownTimeout`.

## Errors

| Error | Meaning |
| --- | --- |
| `DatabasePathInvalid` | Provided `databasePath` cannot be used for persistence. |
| `ShutdownTimeout` | Shutdown exceeded `shutdownTimeout`. |

## Layering Strategy

- Export a single “live” runtime layer (`NodeRuntimeLive`) that:
  - Validates configuration
  - Initializes protocol
  - Opens the database connection
  - Wires lifecycle hooks

The runtime’s responsibilities stay narrow so that transport selection and topology remain composed outside this package.

## Out of Scope

- Browser and React Native runtimes.
- Worker thread / multi-thread coordination.
- Cluster/multi-process orchestration.
- Bun-specific behavior guarantees.
- Transport implementations and peer discovery.
