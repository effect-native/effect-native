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

const graph = makeGraphDb({
  nodes: [
    nodeDef({
      kind: "user",
      schema: User,
      columns: [
        { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
        { name: "name", sqlType: "TEXT", notNull: true },
        { name: "visits", sqlType: "INTEGER", notNull: true }
      ]
    })
  ]
})

const program = Effect.gen(function*() {
  const db = yield* graph.GraphDb

  yield* db.ensure
  yield* db.node.put("user", { id: "u1", name: "Ada", visits: 1 })

  return yield* db.node.get("user", "u1")
})

const layer = Layer.mergeAll(
  BunSqlite.SqliteClient.layer({ filename: ":memory:" }),
  GraphDialectSqlite.layer(),
  graph.layer
)

void Effect.runPromise(Effect.provide(program, layer))
