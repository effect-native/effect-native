/**
 * Integration tests for CrSql using real CR-SQLite via sqlite-cr CLI tool
 * These tests validate actual CR-SQLite behavior against a real database
 */

import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Command from "@effect/platform/Command"
import * as CommandExecutor from "@effect/platform/CommandExecutor"
import { NodeContext } from "@effect/platform-node"
import * as fs from "node:fs"

// Quick and dirty integration test using sqlite-cr CLI directly
describe("CrSql Integration Tests", () => {
  it("validates sqlite-cr CLI with crsql_site_id()", () =>
    Effect.gen(function* () {
      const executor = yield* CommandExecutor.CommandExecutor
      
      // Generate unique temp database path
      const dbPath = `/tmp/crsql-test-${Date.now()}.db`
      
      // Run sqlite-cr to get site ID
      const command = Command.make(
        "nix",
        "run", 
        "github:subtleGradient/sqlite-cr",
        "--",
        dbPath,
        "SELECT hex(crsql_site_id())"
      )
      
      const result = yield* executor.exitCode(command)
      
      // Clean up
      yield* Effect.sync(() => {
        try { fs.unlinkSync(dbPath) } catch {}
      })
      
      // If exit code is 0, sqlite-cr and CR-SQLite are working
      assert.strictEqual(result, 0, "sqlite-cr should execute crsql_site_id() successfully")
    }).pipe(
      Effect.provide(NodeContext.layer),
      Effect.runPromise
    )
  )
  
  it("gets a valid site ID from CR-SQLite", () =>
    Effect.gen(function* () {
      const executor = yield* CommandExecutor.CommandExecutor
      
      // Generate unique temp database path
      const dbPath = `/tmp/crsql-test-${Date.now()}.db`
      
      // Run sqlite-cr to get site ID and capture output
      const command = Command.make(
        "nix",
        "run", 
        "github:subtleGradient/sqlite-cr",
        "--",
        "-line",
        dbPath,
        "SELECT hex(crsql_site_id()) as site_id"
      )
      
      const output = yield* executor.string(command)
      
      // Clean up
      yield* Effect.sync(() => {
        try { fs.unlinkSync(dbPath) } catch {}
      })
      
      // Parse output (format: "site_id = HEXSTRING")
      const match = output.match(/site_id = ([0-9A-F]+)/i)
      assert.ok(match, "Should find site_id in output")
      
      const siteId = match![1]
      assert.strictEqual(siteId.length, 32, "Site ID should be 32 hex characters")
      assert.match(siteId, /^[0-9A-F]{32}$/i)
    }).pipe(
      Effect.provide(NodeContext.layer),
      Effect.runPromise
    )
  )
})