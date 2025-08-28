/**
 * Integration tests for CrSql using real CR-SQLite via sqlite-cr CLI tool
 * These tests validate actual CR-SQLite behavior against a real database
 */

import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Command from "@effect/platform/Command"
import * as CommandExecutor from "@effect/platform/CommandExecutor"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { assert, describe, it, layer } from "@effect/vitest"
import { Effect } from "effect"
import * as Console from "effect/Console"
import * as Schema from "effect/Schema"
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

      const output = yield* executor.string(command)

      // Parse JSON array output from sqlite-cr
      const jsonSchema = Schema.parseJson(Schema.Array(Schema.Struct({
        site_id: SiteIdHex
      })))

      const results = yield* Schema.decode(jsonSchema)(output)
      const siteId = results[0].site_id

      // Schema has already validated the format, just check the length
      assert.strictEqual(siteId.length, 32)
    }))
})
