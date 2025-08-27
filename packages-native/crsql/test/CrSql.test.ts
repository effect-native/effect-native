import * as CrSql from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as SqlClient from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import type { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import { assert, layer as withLayer } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import * as Context from "effect/Context"

// Build a SqlClient layer with pattern-based response matching
// Matches queries based on SQL patterns and parameters rather than exact SQL
const makeTestSqlClientLayer = (seed: Record<string, ReadonlyArray<unknown>>) =>
  Layer.scopedContext(Effect.gen(function*() {
    const connection: Connection = {
      execute: (sql: string, params, transformRows) =>
        Effect.sync(() => {
          let rows: ReadonlyArray<unknown> = []

          // Pattern-based matching for different query types
          if (sql.includes("crsql_site_id()")) {
            rows = seed["crsql_site_id"] || []
          } else if (sql.includes("crsql_db_version()")) {
            rows = seed["db_version"] || []
          } else if (sql.includes("FROM crsql_changes")) {
            // For pullChanges, differentiate by the 'since' parameter and exclusions
            const sinceParam = params?.[0] || "0"

            if (sql.includes("NOT IN")) {
              // excludeSites variant
              const key = `crsql_changes:since=${sinceParam}:excludes`
              rows = seed[key] || []
            } else {
              // normal variant
              const key = `crsql_changes:since=${sinceParam}`
              rows = seed[key] || seed["crsql_changes:default"] || []
            }
          } else if (sql.includes("INSERT INTO crsql_changes")) {
            // For applyChanges INSERT operations
            rows = seed["insert_crsql_changes"] || []
          }

          return transformRows ? transformRows(rows as any) : rows
        }),
      executeRaw: () => Effect.succeed([]),
      executeStream: () => Stream.empty as Stream.Stream<unknown, SqlError>,
      executeValues: () => Effect.succeed([]),
      executeUnprepared: () => Effect.succeed([])
    }

    const client = yield* SqlClient.make({
      acquirer: Effect.succeed(connection),
      compiler: Statement.makeCompilerSqlite(),
      spanAttributes: []
    }).pipe(Effect.provide(Reactivity.layer))

    return Context.make(SqlClient.SqlClient, client)
  }))

withLayer(
  CrSql.CrSql.Default.pipe(
    Layer.provide(
      makeTestSqlClientLayer({
        // Pattern-based keys for cleaner test setup
        "crsql_site_id": [{ site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }],
        "db_version": [{ version: "42" }],
        "crsql_changes:since=0": [
          {
            table: "users",
            pk: "DEADBEEF",
            cid: "name",
            val: "Alice",
            val_type: "text",
            col_version: "1",
            db_version: "1",
            site_id: "A1B2C3D4E5F6789012345678ABCDEF90",
            cl: 1,
            seq: 0
          }
        ],
        "crsql_changes:since=10": [
          {
            table: "documents",
            pk: "CAFEBABE",
            cid: "title",
            val: "Report",
            val_type: "text",
            col_version: "2",
            db_version: "11",
            site_id: "B2C3D4E5F6789012345678ABCDEF90A1",
            cl: 2,
            seq: 1
          }
        ],
        "crsql_changes:since=0:excludes": [
          {
            table: "posts",
            pk: "FEEDFACE",
            cid: "content",
            val: "Hello World",
            val_type: "text",
            col_version: "1",
            db_version: "5",
            site_id: "D4E5F6789012345678ABCDEF90A1B2C3",
            cl: 1,
            seq: 2
          }
        ],
        "insert_crsql_changes": []
      })
    )
  )
)("CrSql", (it) => {
  it.scoped("returns SiteIdHex for this database", () =>
    Effect.gen(function*() {
      const siteId = yield* CrSql.CrSql.getSiteIdHex
      assert.strictEqual(siteId, "A1B2C3D4E5F6789012345678ABCDEF90")
    }))

  it.scoped("returns the database version", () =>
    Effect.gen(function*() {
      const version = yield* CrSql.CrSql.getDbVersion
      assert.strictEqual(version, "42")
    }))

  it.scoped("pulls all changes from the database", () =>
    Effect.gen(function*() {
      const changes = yield* CrSql.CrSql.pullChanges()
      assert.deepEqual(changes, [
        {
          table: "users",
          pk: "DEADBEEF",
          cid: "name",
          val: "Alice",
          val_type: "text",
          col_version: "1",
          db_version: "1",
          site_id: "A1B2C3D4E5F6789012345678ABCDEF90",
          cl: 1,
          seq: 0
        }
      ])
    }))

  it.scoped("pulls changes since a specific version", () =>
    Effect.gen(function*() {
      const changes = yield* CrSql.CrSql.pullChanges("10")
      assert.deepEqual(changes, [
        {
          table: "documents",
          pk: "CAFEBABE",
          cid: "title",
          val: "Report",
          val_type: "text",
          col_version: "2",
          db_version: "11",
          site_id: "B2C3D4E5F6789012345678ABCDEF90A1",
          cl: 2,
          seq: 1
        }
      ])
    }))

  it.scoped("applies a change to the database", () =>
    Effect.gen(function*() {
      const change: CrSql.ChangeRow = {
        table: "users",
        pk: "DEADBEEF",
        cid: "email",
        val: "alice@example.com",
        val_type: "text",
        col_version: "3",
        db_version: "15",
        site_id: "C3D4E5F6789012345678ABCDEF90A1B2",
        cl: 2,
        seq: 1
      }

      yield* CrSql.CrSql.applyChanges([change])
      // Test succeeds if no error is thrown
    }))

  it.scoped("pulls changes excluding specific sites", () =>
    Effect.gen(function*() {
      const changes = yield* CrSql.CrSql.pullChanges("0", ["A1B2C3D4E5F6789012345678ABCDEF90"])
      assert.deepEqual(changes, [
        {
          table: "posts",
          pk: "FEEDFACE",
          cid: "content",
          val: "Hello World",
          val_type: "text",
          col_version: "1",
          db_version: "5",
          site_id: "D4E5F6789012345678ABCDEF90A1B2C3",
          cl: 1,
          seq: 2
        }
      ])
    }))

  // =============================================================================
  // MISSING TEST SPECIFICATIONS - TO BE IMPLEMENTED
  // =============================================================================
  // Based on TODO.md lines 846-969, the complete CrsqlitePreparedStatements interface needs:
  //
  // Current implementation has:
  // ✓ getSiteIdHex: Gets site ID as hex string
  // ✓ getDbVersion: Gets database version
  //
  // Still missing (to be implemented):

  // =============================================================================
  // CHANGE OPERATIONS
  // =============================================================================

  // TODO: Test pullChanges with no parameters
  // Method: pullChanges
  // Test: pulls all changes from crsql_changes table
  // SQL: SELECT "table", hex(pk) as pk, cid, CASE WHEN val IS NULL THEN NULL WHEN typeof(val) = 'blob' THEN hex(val) ELSE val END as val, typeof(val) as val_type, CAST(col_version AS TEXT) as col_version, CAST(db_version AS TEXT) as db_version, hex(site_id) as site_id, cl, seq FROM crsql_changes WHERE db_version > CAST(? AS INTEGER) AND (? IS NULL OR hex(site_id) NOT IN (?)) ORDER BY db_version, seq

  // TODO: Test pullChanges with since version parameter
  // Method: pullChanges
  // Test: pulls changes since specific version (e.g., since version "10")
  // SQL: Same as above with since=10 parameter
  // Expected: Only changes with db_version > 10

  // TODO: Test pullChanges with excludeSites parameter
  // Method: pullChanges
  // Test: excludes changes from specific site IDs
  // SQL: Same as above with excludeSites parameter
  // Expected: Changes from excluded sites are filtered out

  // TODO: Test pullChanges with both since and excludeSites
  // Method: pullChanges
  // Test: combines version filtering with site exclusion
  // SQL: Same as above with both parameters
  // Expected: Only recent changes from non-excluded sites

  // TODO: Test pullChanges handles different value types correctly
  // Method: pullChanges
  // Test: properly serializes NULL, TEXT, INTEGER, REAL, and BLOB values
  // SQL: Same as above
  // Expected: val_type field correctly identifies type, BLOB values are hex-encoded

  // TODO: Test applyChanges inserts single change
  // Method: applyChanges
  // Test: inserts a single change record into crsql_changes
  // SQL: INSERT INTO crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq) VALUES (?, unhex(?), ?, CASE WHEN ? = 'null' THEN NULL WHEN ? = 'blob' THEN unhex(?) ELSE ? END, CAST(? AS INTEGER), CAST(? AS INTEGER), unhex(?), ?, ?)

  // TODO: Test applyChanges with NULL value
  // Method: applyChanges
  // Test: correctly handles NULL values using val_type='null'
  // SQL: Same as above with val_type='null'
  // Expected: NULL stored in database

  // TODO: Test applyChanges with BLOB value
  // Method: applyChanges
  // Test: correctly handles BLOB values with hex decoding
  // SQL: Same as above with val_type='blob' and hex-encoded val
  // Expected: Binary data properly decoded from hex and stored

  // TODO: Test applyChanges with TEXT/INTEGER/REAL values
  // Method: applyChanges
  // Test: correctly handles primitive values without conversion
  // SQL: Same as above with appropriate val_type
  // Expected: Values stored as-is

  // TODO: Test applyChanges handles primary key hex decoding
  // Method: applyChanges
  // Test: unhex() correctly converts pk from hex string to binary
  // SQL: Same as above
  // Expected: Primary key properly decoded from hex

  // TODO: Test applyChanges handles site_id hex decoding
  // Method: applyChanges
  // Test: unhex() correctly converts site_id from hex string to binary
  // SQL: Same as above
  // Expected: Site ID properly decoded from hex

  // TODO: Test applyChanges handles version string to integer conversion
  // Method: applyChanges
  // Test: CAST properly converts col_version and db_version from strings
  // SQL: Same as above
  // Expected: Versions stored as proper INTEGER values

  // =============================================================================
  // PEER VERSION TRACKING
  // =============================================================================

  // TODO: Test setPeerVersion inserts new peer version
  // Method: setPeerVersion
  // Test: inserts version info for a peer site
  // SQL: INSERT OR REPLACE INTO crsql_tracked_peers (site_id, version, tag, event, seq) VALUES (unhex(?), CAST(? AS INTEGER), 0, 0, ?)
  // Expected: Peer version record created with correct site_id and version

  // TODO: Test setPeerVersion updates existing peer version
  // Method: setPeerVersion
  // Test: updates version for existing peer (OR REPLACE behavior)
  // SQL: Same as above
  // Expected: Existing peer version updated to new value

  // TODO: Test setPeerVersion handles hex site_id conversion
  // Method: setPeerVersion
  // Test: unhex() correctly converts site_id parameter
  // SQL: Same as above
  // Expected: Site ID properly stored as binary

  // TODO: Test setPeerVersion handles version string to integer conversion
  // Method: setPeerVersion
  // Test: CAST properly converts version from string to INTEGER
  // SQL: Same as above
  // Expected: Version stored as proper INTEGER

  // TODO: Test getPeerVersion retrieves version for existing peer
  // Method: getPeerVersion
  // Test: returns version and seq for known peer
  // SQL: SELECT CAST(version AS TEXT) as version, seq FROM crsql_tracked_peers WHERE site_id = unhex(?)
  // Expected: Returns version as string and seq number

  // TODO: Test getPeerVersion returns empty for unknown peer
  // Method: getPeerVersion
  // Test: returns no results for peer not in tracked_peers table
  // SQL: Same as above
  // Expected: Empty result set

  // TODO: Test getPeerVersion handles site_id hex conversion
  // Method: getPeerVersion
  // Test: unhex() correctly converts site_id parameter for lookup
  // SQL: Same as above
  // Expected: Proper binary comparison for site_id

  // TODO: Test getPeerVersion returns version as string
  // Method: getPeerVersion
  // Test: CAST properly converts version from INTEGER to TEXT
  // SQL: Same as above
  // Expected: Version returned as string to avoid JS precision loss

  // =============================================================================
  // TRANSACTION MANAGEMENT
  // =============================================================================

  // TODO: Test beginTx starts immediate transaction
  // Method: beginTx
  // Test: executes BEGIN IMMEDIATE to start transaction with immediate lock
  // SQL: BEGIN IMMEDIATE
  // Expected: Transaction started, database locked for writes

  // TODO: Test commitTx commits active transaction
  // Method: commitTx
  // Test: executes COMMIT to finalize transaction
  // SQL: COMMIT
  // Expected: Transaction committed, locks released

  // TODO: Test rollbackTx rolls back active transaction
  // Method: rollbackTx
  // Test: executes ROLLBACK to abort transaction
  // SQL: ROLLBACK
  // Expected: Transaction aborted, changes discarded, locks released

  // TODO: Test transaction sequence: begin -> operations -> commit
  // Method: beginTx, applyChanges, commitTx
  // Test: atomic sequence of operations within transaction
  // SQL: BEGIN IMMEDIATE, INSERT statements, COMMIT
  // Expected: All changes committed atomically

  // TODO: Test transaction sequence: begin -> operations -> rollback
  // Method: beginTx, applyChanges, rollbackTx
  // Test: atomic rollback of operations within transaction
  // SQL: BEGIN IMMEDIATE, INSERT statements, ROLLBACK
  // Expected: No changes persisted, clean rollback

  // TODO: Test transaction isolation with concurrent operations
  // Method: beginTx on multiple connections
  // Test: IMMEDIATE transactions properly isolate concurrent operations
  // SQL: Multiple BEGIN IMMEDIATE from different connections
  // Expected: Proper locking behavior, no race conditions

  // =============================================================================
  // INTEGRATION SCENARIOS
  // =============================================================================

  // TODO: Test complete sync scenario: pull -> apply -> commit
  // Method: pullChanges, applyChanges, beginTx, commitTx
  // Test: end-to-end change synchronization with transaction safety
  // SQL: Combined operations in proper sequence
  // Expected: Changes properly synchronized with ACID guarantees

  // TODO: Test error recovery: begin -> error -> rollback
  // Method: beginTx, applyChanges (with error), rollbackTx
  // Test: proper error handling with transaction cleanup
  // SQL: BEGIN IMMEDIATE, failed INSERT, ROLLBACK
  // Expected: Clean error recovery, no partial state

  // TODO: Test peer version tracking during sync
  // Method: pullChanges, setPeerVersion, getPeerVersion
  // Test: version vectors properly maintained during synchronization
  // SQL: Combined peer tracking operations
  // Expected: Consistent peer version state

  // TODO: Test change validation and rejection
  // Method: applyChanges with invalid data
  // Test: malformed changes are properly rejected
  // SQL: INSERT with constraint violations
  // Expected: Appropriate errors, no data corruption

  // TODO: Test large change batch performance
  // Method: applyChanges with many changes
  // Test: performance characteristics with bulk operations
  // SQL: Multiple INSERT statements
  // Expected: Acceptable performance, proper batching

  // TODO: Test concurrent peer synchronization
  // Method: Multiple pullChanges/applyChanges from different peers
  // Test: multiple peers synchronizing simultaneously
  // SQL: Overlapping change operations
  // Expected: Proper conflict resolution, consistent final state

  // =============================================================================
  // EDGE CASES AND ERROR CONDITIONS
  // =============================================================================

  // TODO: Test pullChanges with invalid version parameter
  // Method: pullChanges with malformed version string
  // Test: proper error handling for invalid input
  // SQL: SELECT with invalid CAST parameter
  // Expected: Clear error message, no database corruption

  // TODO: Test applyChanges with malformed hex data
  // Method: applyChanges with invalid hex strings
  // Test: unhex() error handling for bad input
  // SQL: INSERT with invalid unhex() parameter
  // Expected: Proper error propagation

  // TODO: Test site_id consistency across operations
  // Method: getSiteIdHex, pullChanges, applyChanges
  // Test: same site_id used consistently across all operations
  // SQL: Various operations using crsql_site_id()
  // Expected: Consistent site identification

  // TODO: Test version ordering and consistency
  // Method: pullChanges, getDbVersion
  // Test: version numbers are monotonically increasing and consistent
  // SQL: Version-based queries and MAX operations
  // Expected: Proper ordering, no version conflicts

  // TODO: Test empty database operations
  // Method: pullChanges, getDbVersion on empty database
  // Test: operations work correctly with no existing changes
  // SQL: Operations on empty crsql_changes table
  // Expected: Graceful handling of empty state
})
