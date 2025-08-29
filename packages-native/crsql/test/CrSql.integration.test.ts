/**
 * Integration tests for CrSql using real CR-SQLite via sqlite-cr CLI tool
 * These tests validate actual CR-SQLite behavior against a real database
 */

import * as CrSql from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Command from "@effect/platform/Command"
import * as CommandExecutor from "@effect/platform/CommandExecutor"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as SqlClient from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import * as Statement from "@effect/sql/Statement"
import { assert, describe, it, layer } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import * as Schema from "effect/Schema"

const tmpDBPath = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const tmpDir = yield* fs.makeTempDirectoryScoped()
  const path = yield* Path.Path
  return path.join(tmpDir, `crsql-test-${Date.now()}.db`)
})

// Quick and dirty integration test using sqlite-cr CLI directly
layer(NodeContext.layer)("CrSql Integration Tests", (it) => {
  it.scoped("validates sqlite-cr CLI with crsql_site_id()", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath
      const executor = yield* CommandExecutor.CommandExecutor

      // Run sqlite-cr to get site ID
      const command = Command.make(
        "nix",
        "run",
        "github:subtleGradient/sqlite-cr",
        "--",
        dbPath,
        "SELECT hex(crsql_site_id())"
      )

      // If exit code is 0, sqlite-cr and CR-SQLite are working
      assert.strictEqual(
        yield* executor.exitCode(command),
        0,
        "sqlite-cr should execute crsql_site_id() successfully"
      )
    }))

  it.scoped("gets a valid site ID from CR-SQLite", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath
      const executor = yield* CommandExecutor.CommandExecutor

      // Generate unique temp database path
      // Run sqlite-cr to get site ID and capture output
      // Use -json output mode for easier parsing
      const command = Command.make(
        "nix",
        "run",
        "github:subtleGradient/sqlite-cr",
        "--",
        "-json",
        dbPath,
        "SELECT hex(crsql_site_id()) as site_id"
      )

      const schema = Schema.parseJson(Schema.Array(Schema.Struct({
        site_id: CrSql.schema.SiteIdHex
      })))

      const [{ site_id }] = yield* executor.string(command).pipe(Effect.flatMap(Schema.decode(schema)))

      assert.ok(Schema.is(CrSql.schema.SiteIdHex)(site_id), "site_id should be valid SiteIdHex")
    }))
})

// Minimal SqlClient layer using sqlite-cr - just enough to test our CrSql service
const TestSqlClientLayer = Layer.scoped(
  SqlClient.SqlClient,
  Effect.gen(function*() {
    const dbPath = yield* tmpDBPath
    const executor = yield* CommandExecutor.CommandExecutor

    // Minimal Connection implementation - only what we need for testing
    const connection: Connection = {
      // Main execute method - handles parameterized queries
      execute: (sql, params, transformRows) =>
        Effect.gen(function*() {
          // Quick and dirty param replacement - good enough for testing
          let sqlWithParams = sql
          if (params && params.length > 0) {
            let paramIndex = 0
            sqlWithParams = sql.replace(/\?/g, () => {
              const param = params[paramIndex++]
              if (param === null || param === undefined) return "NULL"
              if (typeof param === "string") return `'${param.replace(/'/g, "''")}'`
              return String(param)
            })
          }

          const command = Command.make(
            "nix",
            "run",
            "github:subtleGradient/sqlite-cr",
            "--",
            "-json",
            dbPath,
            sqlWithParams
          )

          const output = yield* executor.string(command).pipe(
            Effect.orDieWith((cause) => new Error(`DEFECT: Failed to execute SQL with sqlite-cr cli tool`, { cause }))
          )

          // Handle empty output from sqlite-cr
          const rows = output.trim() === "" ? [] : JSON.parse(output)
          return transformRows ? transformRows(rows) : rows
        }),

      // Stub implementations - we don't use these for CrSql testing
      executeRaw: () => Effect.succeed([]),
      executeStream: () => Stream.empty,
      executeValues: () => Effect.succeed([]),
      executeUnprepared: () => Effect.succeed([])
    }

    return yield* SqlClient.make({
      acquirer: Effect.succeed(connection),
      compiler: Statement.makeCompilerSqlite(),
      spanAttributes: [] // Required for SqlClient
    })
  })
).pipe(
  Layer.provide(NodeContext.layer),
  Layer.provide(Reactivity.layer)
)

const FreshTestLayer = TestSqlClientLayer

// Test the real CrSql service with actual CR-SQLite
describe("CrSql with Real CR-SQLite", () => {
  it.scoped("gets site ID from real CrSql service", () =>
    Effect.gen(function*() {
      const siteId = yield* CrSql.CrSql.getSiteIdHex

      // Should be a valid 32-char hex string
      assert.strictEqual(siteId.length, 32)
      assert.match(siteId, /^[0-9A-F]{32}$/i)
    }).pipe(Effect.provide(FreshTestLayer)).pipe(Effect.provide(FreshTestLayer)))

  it.scoped("gets database version from real CR-SQLite", () =>
    Effect.gen(function*() {
      const version = yield* CrSql.CrSql.getDbVersion

      // Fresh database should have version "0"
      assert.strictEqual(version, "0")
    }).pipe(Effect.provide(FreshTestLayer)))

  it.scoped("pullChanges works with empty database", () =>
    Effect.gen(function*() {
      // Pull changes from empty database
      const changes = yield* CrSql.CrSql.pullChanges("0")

      // Should return empty array, not crash
      assert.strictEqual(changes.length, 0)
    }).pipe(Effect.provide(FreshTestLayer)))

  it.scoped("sets and retrieves a new peer version", () =>
    Effect.gen(function*() {
      const siteId = "A1B2C3D4E5F6789012345678ABCDEF90"

      // Set a new peer version
      yield* CrSql.CrSql.setPeerVersion(siteId, "42", 100)

      // Get it back
      const result = yield* CrSql.CrSql.getPeerVersion(siteId)

      // Should return what we set
      assert.strictEqual(result?.version, "42")
      assert.strictEqual(result?.seq, 100)
    }).pipe(Effect.provide(FreshTestLayer)))

  it.scoped("updates an existing peer version", () =>
    Effect.gen(function*() {
      const siteId = "A1B2C3D4E5F6789012345678ABCDEF90"

      // Set initial version
      yield* CrSql.CrSql.setPeerVersion(siteId, "42", 100)

      // Update with new version
      yield* CrSql.CrSql.setPeerVersion(siteId, "100", 200)

      // Get the updated version
      const result = yield* CrSql.CrSql.getPeerVersion(siteId)

      // Should return the updated values
      assert.strictEqual(result?.version, "100")
      assert.strictEqual(result?.seq, 200)
    }).pipe(Effect.provide(FreshTestLayer)))

  it.scoped("returns null for unknown peer", () =>
    Effect.gen(function*() {
      // Get version for non-existent peer
      const result = yield* CrSql.CrSql.getPeerVersion("NONEXISTENTPEERSITE123456789ABCDEF")

      // Should return null for unknown peer
      assert.strictEqual(result, null)
    }).pipe(Effect.provide(FreshTestLayer)))

  it.scoped("handles multiple peers independently", () =>
    Effect.gen(function*() {
      const peer1 = "A1B2C3D4E5F6789012345678ABCDEF90"
      const peer2 = "B2C3D4E5F6789012345678ABCDEF90A1"

      // Set versions for different peers
      yield* CrSql.CrSql.setPeerVersion(peer1, "100", 10)
      yield* CrSql.CrSql.setPeerVersion(peer2, "200", 20)

      // Get them back
      const result1 = yield* CrSql.CrSql.getPeerVersion(peer1)
      const result2 = yield* CrSql.CrSql.getPeerVersion(peer2)

      // Each peer should have its own version
      assert.strictEqual(result1?.version, "100")
      assert.strictEqual(result1?.seq, 10)
      assert.strictEqual(result2?.version, "200")
      assert.strictEqual(result2?.seq, 20)
    }).pipe(Effect.provide(FreshTestLayer)))
})
