import { expect, layer } from "@effect-native/bun-test"
import { CrSql } from "@effect-native/crsql"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import { Effect, Layer } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import { SqlClient } from "effect/unstable/sql"
import { createTodosCrr, ensureCrSqlLoaded } from "./_helpers.js"

layer(Layer.mergeAll(Reactivity.layer))((it) => {
  it.effect("CrSql.schemaFromChanges -> automigrate -> applyChanges recreates exported rows", () =>
    Effect.gen(function*() {
      // Stage 1: Produce realistic changes from an existing CRR table
      const exported = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const sql = yield* SqlClient.SqlClient
        const pk1 = "00112233445566778899AABBCCDDEEFF"
        const pk2 = "FFEEDDCCBBAA99887766554433221100"
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex(${pk1}), 'Alpha', 0)`
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex(${pk2}), 'Beta', 1)`
        const crsql = yield* CrSql.fromSqliteClient({ sql })
        return yield* crsql.pullChanges("0")
      }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" })))

      expect(exported.length).toBeGreaterThan(0)
      // Sanity: contains todos/content and todos/completed deltas
      expect(exported.some((c) => c.table === "todos" && c.cid === "content")).toBe(true)
      expect(exported.some((c) => c.table === "todos" && c.cid === "completed")).toBe(true)

      // Stage 2: Derive schema from the exported changes
      const schema = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        const crsql = yield* CrSql.fromSqliteClient()
        // New API under test: derive a SQLite schema suitable for crsql_automigrate
        return yield* crsql.__experimental__schemaFromChanges(exported)
      }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" })))

      // The derived schema should target the todos table and enable CRR
      expect(schema).toContain("CREATE TABLE IF NOT EXISTS todos")
      expect(schema).toContain("SELECT crsql_as_crr('todos')")

      // Stage 3: Apply the derived schema to a fresh DB, then apply the changes
      yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        const sql = yield* SqlClient.SqlClient
        const crsql = yield* CrSql.fromSqliteClient()
        yield* crsql.automigrate(schema)
        yield* crsql.applyChanges(exported)

        // Verify both rows are present and match values
        const rows = yield* sql<{ content: string; completed: number }>`
          SELECT content, completed FROM todos ORDER BY content ASC
        `
        expect(rows).toEqual([
          { content: "Alpha", completed: 0 },
          { content: "Beta", completed: 1 }
        ])
      }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" })))
    }))
})
