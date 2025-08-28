# @effect-native/sql-sqlite-cli

A SQLite-CR (CRDT-enabled SQLite) client for Effect, providing a SqlClient implementation that uses sqlite-cr CLI commands under the hood.

## Features

- Full SqlClient interface implementation
- CRDT-enabled SQLite operations through sqlite-cr
- Effect-native error handling and resource management
- Transaction support
- Streaming query results
- Type-safe SQL operations

## Installation

This package requires sqlite-cr to be available in your PATH. If you're using the nix development environment provided in this repository, sqlite-cr is already included.

## Usage

```typescript
import { CommandExecutor } from "@effect/platform"
import { NodeCommandExecutor } from "@effect/platform-node"
import { SqlClient } from "@effect/sql"
import { Effect, Layer } from "effect"
import * as SqliteCrClient from "@effect-native/sql-sqlite-cli"

// Create a SqliteCrClient layer
const SqliteCrLive = SqliteCrClient.layerConfig({
  filename: "database.db"
}).pipe(
  Layer.provide(NodeCommandExecutor.layer)
)

// Use the client
const program = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient

  // Create a table
  yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)`

  // Insert data
  yield* sql`INSERT INTO users (name, age) VALUES ('Alice', 30)`
  yield* sql`INSERT INTO users (name, age) VALUES ('Bob', 25)`

  // Query data
  const users = yield* sql`SELECT * FROM users ORDER BY id`
  console.log(users)
  // Output: [{ id: 1, name: "Alice", age: 30 }, { id: 2, name: "Bob", age: 25 }]
})

Effect.runPromise(Effect.provide(program, SqliteCrLive))
```

## Transaction Support

```typescript
const transferMoney = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient

  yield* sql.withTransaction(Effect.gen(function*() {
    yield* sql`UPDATE accounts SET balance = balance - 100 WHERE id = 1`
    yield* sql`UPDATE accounts SET balance = balance + 100 WHERE id = 2`
  }))
})
```

## Configuration

The `SqliteCrClientConfig` interface supports the following options:

- `filename`: Path to the SQLite database file
- `readonly`: Whether to open the database in read-only mode (optional)
- `spanAttributes`: Additional attributes for tracing spans (optional)
- `transformResultNames`: Function to transform column names in results (optional)
- `transformQueryNames`: Function to transform table/column names in queries (optional)

## Requirements

- sqlite-cr must be available in your PATH
- @effect/platform CommandExecutor for CLI execution
- Node.js environment (for @effect/platform-node)

## CRDT Features

Since this client uses sqlite-cr under the hood, you get access to all the CRDT capabilities of sqlite-cr, including:

- Automatic conflict resolution for concurrent updates
- Eventual consistency across distributed instances
- Vector clock-based change tracking
- Support for offline-first applications

The CRDT features are available through the same SQL interface - sqlite-cr handles the CRDT operations transparently.
