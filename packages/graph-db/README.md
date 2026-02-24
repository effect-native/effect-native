# @effect-native/graph-db

Graph DB service for Effect v4 with schema-planned table ensure and a universal edge table.

## Features

- delegated node tables (`node_<kind>`)
- single universal edge table (`graph_edge`)
- expand-only schema ensure with typed incompatible-plan failures
- SQLite dialect with optional CRR planning rules

## Install (workspace)

```bash
bun add @effect-native/graph-db
```

## Basic Usage

```ts
import { GraphDialectSqlite, makeGraphDb, nodeDef } from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  visits: Schema.Number
})

const spec = {
  nodes: [
    nodeDef({
      kind: "user",
      schema: User,
      columns: [
        { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
        { name: "name", sqlType: "TEXT", notNull: true },
        { name: "visits", sqlType: "INTEGER", notNull: true }
      ],
      indexes: [{ name: "node_user_name_idx", columns: ["name"] }]
    })
  ]
} as const

const graph = makeGraphDb(spec)

const program = Effect.gen(function*() {
  const db = yield* graph.GraphDb

  yield* db.ensure
  yield* db.node.put("user", { id: "u1", name: "Ada", visits: 1 })
  yield* db.edge.put("follows", "u1", "u2", { since: 2025 })

  const user = yield* db.node.get("user", "u1")
  const out = yield* db.edge.out("u1")

  return { user, out }
})

const layer = Layer.mergeAll(
  BunSqlite.SqliteClient.layer({ filename: ":memory:" }),
  GraphDialectSqlite.layer(),
  graph.layer
)

await Effect.runPromise(Effect.provide(program, layer))
```

## CRR Mode

Set `replication: "crr"` on spec or table definitions.

In CRR mode planning:

- secondary unique indexes are rejected in the incompatible plan
- alter plans include `crsql_begin_alter` / `crsql_commit_alter` wrappers

## Ensure Behavior

`db.ensure` performs expand-only migrations:

- create missing tables
- add missing columns
- add missing indexes
- fail with typed `GraphEnsureError` when a destructive change is needed
