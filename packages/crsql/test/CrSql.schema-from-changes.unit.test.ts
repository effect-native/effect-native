import { expect, it } from "@effect-native/bun-test"
import { CrSql } from "@effect-native/crsql"
import type * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import { Effect } from "effect"
import { SqlClient } from "effect/unstable/sql"
import { ensureCrSqlLoaded } from "./_helpers.js"

const makeChange = (
  overrides: Partial<CrSqlSchema.ChangeRowSerialized> = {}
): CrSqlSchema.ChangeRowSerialized => ({
  cid: "value",
  cl: 0,
  col_version: "1",
  db_version: "1",
  pk: "00112233445566778899AABBCCDDEEFF",
  seq: 0,
  site_id: "00112233445566778899AABBCCDDEEFF",
  table: "items",
  val: null,
  val_type: "null",
  ...overrides
})

it.effect("schemaFromChanges rejects a column observed only as null", () =>
  Effect.gen(function*() {
    const crsql = yield* ensureCrSqlLoaded
    const error = yield* crsql.__experimental__schemaFromChanges([makeChange()]).pipe(Effect.flip)

    expect(error.message).toContain("Unable to infer type for items.value")
  }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.effect("schemaFromChanges uses a concrete observation after null", () =>
  Effect.gen(function*() {
    const crsql = yield* ensureCrSqlLoaded
    const schema = yield* crsql.__experimental__schemaFromChanges([
      makeChange(),
      makeChange({ seq: 1, val: "text", val_type: "text" })
    ])

    expect(schema).toContain("value TEXT")
  }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.effect("schemaFromChanges: infers columns for todos", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.fromSqliteClient()

    // Create a simple CRR and insert a row
    yield* sql`CREATE TABLE IF NOT EXISTS todos (id BLOB NOT NULL PRIMARY KEY, content TEXT NOT NULL DEFAULT '', completed INTEGER NOT NULL DEFAULT 0)`
    yield* crsql.asCrr("todos")
    yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex('00112233445566778899AABBCCDDEEFF'), 'Alpha', 0)`

    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    expect(schema).toContain("CREATE TABLE IF NOT EXISTS todos")
    expect(schema).toContain("content TEXT")
    expect(schema).toContain("completed INTEGER")
    expect(schema).toContain("SELECT crsql_as_crr('todos')")
  }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.effect("schemaFromChanges: includes multiple tables present in changes", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.fromSqliteClient()

    // Define two CRRs and insert into both
    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS a (id BLOB NOT NULL PRIMARY KEY, x TEXT NOT NULL DEFAULT '');
      SELECT crsql_as_crr('a');
      CREATE TABLE IF NOT EXISTS b (id BLOB NOT NULL PRIMARY KEY, y INTEGER NOT NULL DEFAULT 0);
      SELECT crsql_as_crr('b');
    `
    yield* sql`INSERT INTO a (id, x) VALUES (unhex('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), 'v')`
    yield* sql`INSERT INTO b (id, y) VALUES (unhex('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'), 1)`

    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    expect(schema).toContain("CREATE TABLE IF NOT EXISTS a")
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS b")
    expect(schema).toContain("SELECT crsql_as_crr('a')")
    expect(schema).toContain("SELECT crsql_as_crr('b')")
  }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.effect("schemaFromChanges: maps text/integer/real/blob to TEXT/INTEGER/REAL/BLOB", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.fromSqliteClient()

    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS types (
        id BLOB NOT NULL PRIMARY KEY,
        t TEXT NOT NULL DEFAULT '',
        i INTEGER NOT NULL DEFAULT 0,
        r REAL NOT NULL DEFAULT 0.0,
        b BLOB
      );
      SELECT crsql_as_crr('types');
    `
    yield* sql`INSERT INTO types (id, t, i, r, b) VALUES (unhex('CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'), 'txt', 2, 3.14, unhex('ABCD'))`

    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    expect(schema).toContain("t TEXT")
    expect(schema).toContain("i INTEGER")
    expect(schema).toContain("r REAL")
    expect(schema).toContain("b BLOB")
  }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.effect("schemaFromChanges: conflicting types for same column fails", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.fromSqliteClient()

    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS mixed (
        id BLOB NOT NULL PRIMARY KEY,
        v ANY
      );
      SELECT crsql_as_crr('mixed');
    `
    // Insert integer then text for the same column across different rows
    yield* sql`INSERT INTO mixed (id, v) VALUES (unhex('DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'), 123)`
    yield* sql`INSERT INTO mixed (id, v) VALUES (unhex('EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE'), 'abc')`

    const changes = yield* crsql.pullChanges("0")
    const result = yield* crsql.__experimental__schemaFromChanges(changes).pipe(Effect.result)
    expect(result._tag).toBe("Failure")
  }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.effect("schemaFromChanges: deterministic column order (id first, others sorted)", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.fromSqliteClient()

    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS ordercols (
        id BLOB NOT NULL PRIMARY KEY,
        zeta TEXT NOT NULL DEFAULT '',
        alpha TEXT NOT NULL DEFAULT '',
        mid INTEGER NOT NULL DEFAULT 0
      );
      SELECT crsql_as_crr('ordercols');
    `
    yield* sql`INSERT INTO ordercols (id, zeta, alpha, mid) VALUES (unhex('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), 'z', 'a', 1)`

    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    const iAlpha = schema.indexOf(" alpha ")
    const iMid = schema.indexOf(" mid ")
    const iZeta = schema.indexOf(" zeta ")
    expect(iAlpha).toBeGreaterThan(-1)
    expect(iMid).toBeGreaterThan(iAlpha)
    expect(iZeta).toBeGreaterThan(iMid)
  }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))

it.effect("schemaFromChanges: generated schema is idempotent under automigrate", () =>
  Effect.gen(function*() {
    yield* ensureCrSqlLoaded
    const sql = yield* SqlClient.SqlClient
    const crsql = yield* CrSql.fromSqliteClient()

    yield* crsql.automigrate`
      CREATE TABLE IF NOT EXISTS idem (
        id BLOB NOT NULL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT ''
      );
      SELECT crsql_as_crr('idem');
    `
    yield* sql`INSERT INTO idem (id, name) VALUES (unhex('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), 'one')`
    const changes = yield* crsql.pullChanges("0")
    const schema = yield* crsql.__experimental__schemaFromChanges(changes)

    // Apply twice without error
    yield* crsql.automigrate(schema)
    const res = yield* crsql.automigrate(schema).pipe(Effect.result)
    expect(res._tag).toBe("Success")
  }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))
