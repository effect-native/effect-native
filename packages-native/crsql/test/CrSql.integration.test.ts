/**
 * Integration tests for CrSql using real CR-SQLite via sqlite-cr CLI tool
 * These tests validate actual CR-SQLite behavior against a real database
 */

import * as Reactivity from "@effect/experimental/Reactivity"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Command from "@effect/platform/Command"
import * as CommandExecutor from "@effect/platform/CommandExecutor"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as SqlClient from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import * as Statement from "@effect/sql/Statement"
import { assert, layer } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import * as Schema from "effect/Schema"
import * as CrSql from "../src/index.js"
import { SiteIdHex } from "../src/schema.js"

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
      const executor = yield* CommandExecutor.CommandExecutor

      // Generate unique temp database path
      const dbPath = yield* tmpDBPath

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
        site_id: SiteIdHex
      })))

      const [{ site_id }] = yield* executor.string(command).pipe(Effect.flatMap(Schema.decode(schema)))

      assert.ok(Schema.is(SiteIdHex)(site_id), "site_id should be valid SiteIdHex")
    }))
})

// Minimal SqlClient layer using sqlite-cr - just enough to test our CrSql service
const makeRealSqlClientLayer = (dbPath: string) =>
  Layer.scoped(
    SqlClient.SqlClient,
    Effect.gen(function*() {
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
      }).pipe(Effect.provide(Reactivity.layer))
    })
  ).pipe(Layer.provide(NodeContext.layer))

// Test the real CrSql service with actual CR-SQLite
layer(NodeContext.layer)("CrSql with Real CR-SQLite", (it) => {
  it.scoped("gets site ID from real CrSql service", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath

      // Use real CrSql service with real SqlClient
      const crSql = yield* CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeRealSqlClientLayer(dbPath))
          )
        )
      )

      const siteId = yield* crSql.getSiteIdHex

      // Should be a valid 32-char hex string
      assert.strictEqual(siteId.length, 32)
      assert.match(siteId, /^[0-9A-F]{32}$/i)
    }))

  it.scoped("gets database version from real CR-SQLite", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath

      // Use real CrSql service with real SqlClient
      const crSql = yield* CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeRealSqlClientLayer(dbPath))
          )
        )
      )

      const version = yield* crSql.getDbVersion

      // Fresh database should have version "0"
      assert.strictEqual(version, "0")
    }))

  it.scoped("pullChanges works with empty database", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath

      const crSql = yield* CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeRealSqlClientLayer(dbPath))
          )
        )
      )

      // Pull changes from empty database
      const changes = yield* crSql.pullChanges("0")

      // Should return empty array, not crash
      assert.strictEqual(changes.length, 0)
    }))

  it.scoped("sets a new peer version", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath

      const crSql = yield* CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeRealSqlClientLayer(dbPath))
          )
        )
      )

      // Set a new peer version
      yield* crSql.setPeerVersion("A1B2C3D4E5F6789012345678ABCDEF90", "42", 100)

      // Should complete without error
      assert.ok(true)
    }))

  it.scoped("updates an existing peer version", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath

      const crSql = yield* CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeRealSqlClientLayer(dbPath))
          )
        )
      )

      // Set initial version
      yield* crSql.setPeerVersion("A1B2C3D4E5F6789012345678ABCDEF90", "42", 100)

      // Update with new version
      yield* crSql.setPeerVersion("A1B2C3D4E5F6789012345678ABCDEF90", "100", 200)

      // Should complete without error
      assert.ok(true)
    }))

  it.scoped("gets a known peer version", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath

      const crSql = yield* CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeRealSqlClientLayer(dbPath))
          )
        )
      )

      // Set peer version first
      yield* crSql.setPeerVersion("A1B2C3D4E5F6789012345678ABCDEF90", "42", 100)

      // Get the version
      const result = yield* crSql.getPeerVersion("A1B2C3D4E5F6789012345678ABCDEF90")

      // Should return the peer version data
      assert.strictEqual(result.version, "42")
      assert.strictEqual(result.seq, 100)
    }))

  it.scoped("gets an unknown peer version", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath

      const crSql = yield* CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeRealSqlClientLayer(dbPath))
          )
        )
      )

      // Get version for non-existent peer
      const result = yield* crSql.getPeerVersion("NONEXISTENTPEERSITE123456789ABCDEF")

      // Should return null for unknown peer
      assert.strictEqual(result, null)
    }))

  it.scoped("round-trip peer version tracking", () =>
    Effect.gen(function*() {
      const dbPath = yield* tmpDBPath

      const crSql = yield* CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeRealSqlClientLayer(dbPath))
          )
        )
      )

      const siteId = "A1B2C3D4E5F6789012345678ABCDEF90"
      const version = "123456"
      const seq = 789

      // Set peer version
      yield* crSql.setPeerVersion(siteId, version, seq)

      // Get it back
      const result = yield* crSql.getPeerVersion(siteId)

      // Should match what we set
      assert.strictEqual(result?.version, version)
      assert.strictEqual(result?.seq, seq)
    }))
})