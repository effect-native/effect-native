import * as SqlClient from "@effect/sql/SqlClient"
import * as Effect from "effect/Effect"
import * as Errors from "./errors.js"
import type * as CrSqlSchema from "./schema.js"

/**
 * A single CR‑SQLite change row in the pre‑serialized, wire‑friendly shape.
 *
 * Mirrors {@link CrSqlSchema.ChangeRowSerialized}. All fields are already
 * serialized for transport (BLOBs as hex strings, bigint values as base‑10
 * strings). This avoids bigint precision issues and removes the need for
 * JS<->binary conversions at the IO boundary.
 *
 * @since 0.0.0
 */
export type ChangeRow = CrSqlSchema.ChangeRowSerialized

/**
 * CR‑SQLite prepared statements and change APIs over `@effect/sql`.
 *
 * Exposes a minimal, transport‑oriented surface for sync:
 * - Replica identity: {@link CrSql#getSiteIdHex}
 * - Logical version: {@link CrSql#getDbVersion}
 * - Change export: {@link CrSql#pullChanges}
 * - Change import: {@link CrSql#applyChanges}
 * - Peer cursor helpers: {@link CrSql#setPeerVersion}, {@link CrSql#getPeerVersion}
 *
 * All methods operate on serialized shapes (hex strings for BLOBs, base‑10
 * strings for 64‑bit integers). Decoding/encoding is delegated to SQLite via
 * `hex()` / `unhex()` and `CAST(... AS TEXT|INTEGER)`.
 *
 * The default Layer performs capability checks and fails fast with tagged
 * errors when the environment is incompatible:
 * - {@link Errors.UnhexUnavailable} when `unhex()` is missing (SQLite < 3.41)
 * - {@link Errors.CrSqliteExtensionMissing} when `crsql_site_id()` is missing
 *
 * @example
 * import * as CrSql from "@effect-native/crsql"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const crsql = yield* CrSql.CrSql
 *   const siteId = yield* crsql.getSiteIdHex
 *   const since = yield* crsql.getDbVersion
 *   const changes = yield* crsql.pullChanges(since)
 *   yield* crsql.applyChanges(changes)
 * })
 * // .pipe(Effect.provide(CrSql.CrSql.Default), Effect.provide(YourSqlClientLayer))
 *
 * @since 0.0.0
 * @category service
 */
export class CrSql extends Effect.Service<CrSql>()("@effect-native/crsql/CrSql", {
  accessors: true,
  // Service implementation will be provided by the scoped effect
  scoped: Effect.gen(function*() {
    // Acquire the SQL client constructor/template
    const sql = yield* SqlClient.SqlClient

    // Capability checks: verify required SQL functions are available
    // 1) unhex(): available in SQLite >= 3.41.0
    yield* sql`SELECT hex(unhex('00')) as ok`.pipe(
      Effect.catchAll((cause) => Effect.fail(new Errors.UnhexUnavailable({ cause })))
    )

    // 2) crsql_site_id(): indicates CR-SQLite extension is loaded
    yield* sql`SELECT hex(crsql_site_id()) as site_id`.pipe(
      Effect.catchAll((cause) => Effect.fail(new Errors.CrSqliteExtensionMissing({ cause })))
    )

    /**
     * Returns this database's CR‑SQLite site identifier as a 16‑byte hex string.
     *
     * Conceptually, the site ID is a stable replica identity persisted in the
     * database file by CR‑SQLite. It is used to:
     * - Disambiguate the origin of changes during synchronization
     * - Exclude local changes when pulling from remote peers
     *
     * Read via `hex(crsql_site_id())` to match the transport shape.
     *
     * @example
     * import * as CrSql from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const siteId = Effect.gen(function* () {
     *   return yield* CrSql.CrSql.getSiteIdHex
     * })
     *
     * @since 0.0.0
     */
    const getSiteIdHex = Effect.fn("@effect-native/crsql/getSiteIdHex")(function*() {
      const rows = yield* sql<{ site_id: CrSqlSchema.SiteIdHex }>`SELECT hex(crsql_site_id()) AS site_id`
      return rows[0].site_id
    })()

    /**
     * Returns the current CR‑SQLite database version as a base‑10 string.
     *
     * The database version is a monotonically increasing logical clock updated
     * by CR‑SQLite whenever changes are applied. It is commonly used as a
     * cursor when exporting changes (e.g. {@link CrSql#pullChanges}). Casting
     * to TEXT avoids 64‑bit precision issues in JavaScript.
     *
     * @example
     * import * as CrSql from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const version = Effect.gen(function* () {
     *   return yield* CrSql.CrSql.getDbVersion
     * })
     *
     * @since 0.0.0
     */
    const getDbVersion = Effect.fn("@effect-native/crsql/getDbVersion")(function*() {
      const rows = yield* sql<
        { version: CrSqlSchema.VersionString }
      >`SELECT CAST(crsql_db_version() AS TEXT) AS version`
      return rows[0].version
    })()

    /**
     * Pulls CR‑SQLite change rows newer than a given version, optionally
     * excluding changes produced by specific sites.
     *
     * The result is in the pre‑serialized, wire‑ready shape:
     * - `pk` and `site_id` are hex strings (`hex(...)`)
     * - `val` is null, a hex string (when `val_type = 'blob'`), a string, or a
     *   number depending on SQLite's dynamic type
     * - `col_version` and `db_version` are bigint values encoded as base‑10 strings
     * - Results are ordered by `(db_version, seq)` for a deterministic total order
     *
     * @param since - lower bound (exclusive) for `db_version` (default "0")
     * @param excludeSites - optional list of site IDs (hex) to exclude
     *
     * @example
     * import * as CrSql from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const changes = Effect.gen(function* () {
     *   const since = yield* CrSql.CrSql.getDbVersion
     *   return yield* CrSql.CrSql.pullChanges(since, ["A1B2C3D4E5F6789012345678ABCDEF90"])
     * })
     *
     * @since 0.0.0
     */
    const pullChanges = Effect.fn("@effect-native/crsql/pullChanges")(function*(
      since: CrSqlSchema.VersionString = "0",
      excludeSites?: ReadonlyArray<CrSqlSchema.SiteIdHex>
    ) {
      if (excludeSites?.length) {
        return yield* sql<CrSqlSchema.ChangeRowSerialized>`
          SELECT
            "table",
            hex(pk) as pk,
            cid,
            CASE
              WHEN val IS NULL THEN NULL
              WHEN typeof(val) = 'blob' THEN hex(val)
              ELSE val
            END as val,
            typeof(val) as val_type,
            CAST(col_version AS TEXT) as col_version,
            CAST(db_version AS TEXT) as db_version,
            hex(site_id) as site_id,
            cl,
            seq
          FROM crsql_changes
          WHERE db_version > CAST(${since} AS INTEGER)
            AND hex(site_id) NOT IN (${sql.in(excludeSites)})
          ORDER BY db_version, seq
        `
      }
      return yield* sql<CrSqlSchema.ChangeRowSerialized>`
        SELECT
          "table",
          hex(pk) as pk,
          cid,
          CASE
            WHEN val IS NULL THEN NULL
            WHEN typeof(val) = 'blob' THEN hex(val)
            ELSE val
          END as val,
          typeof(val) as val_type,
          CAST(col_version AS TEXT) as col_version,
          CAST(db_version AS TEXT) as db_version,
          hex(site_id) as site_id,
          cl,
          seq
        FROM crsql_changes
        WHERE db_version > CAST(${since} AS INTEGER)
        ORDER BY db_version, seq
      `
    })

    /**
     * Applies a batch of CR‑SQLite change rows in a single transaction.
     *
     * Inverse of {@link CrSql#pullChanges}. Expects the serialized transport
     * shape and performs decoding in SQL:
     * - `unhex(?)` converts hex strings to BLOBs for `pk`, `site_id`, and
     *   `val` when the value type is `blob`
     * - `CAST(... AS INTEGER)` converts bigint strings into 64‑bit integers
     *
     * Notes:
     * - Wrapped in `SqlClient.withTransaction` for atomicity.
     * - Idempotency and conflict semantics are provided by CR‑SQLite.
     *
     * @param changes - array of pre‑serialized change rows to apply
     *
     * @example
     * import * as CrSql from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * const apply = (rows: ReadonlyArray<CrSql.ChangeRow>) =>
     *   CrSql.CrSql.applyChanges(rows)
     *
     * @since 0.0.0
     */
    const applyChanges = Effect.fn("@effect-native/crsql/applyChanges")(function*(
      changes: ReadonlyArray<CrSqlSchema.ChangeRowSerialized>
    ) {
      yield* sql.withTransaction(
        Effect.forEach(
          changes,
          (change) =>
            sql`
              INSERT INTO crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq)
              VALUES (
                ${change.table},
                unhex(${change.pk}),
                ${change.cid},
                CASE
                  WHEN ${change.val_type} = 'null' THEN NULL
                  WHEN ${change.val_type} = 'blob' THEN unhex(${change.val})
                  ELSE ${change.val}
                END,
                CAST(${change.col_version} AS INTEGER),
                CAST(${change.db_version} AS INTEGER),
                unhex(${change.site_id}),
                ${change.cl},
                ${change.seq}
              )
            `,
          { concurrency: "unbounded", discard: true }
        )
      )
    })

    /**
     * Sets or updates the tracked version for a peer site in `crsql_tracked_peers`.
     *
     * Useful for maintaining per‑peer cursors in a pull/apply protocol. Values
     * are stored in the database types and projected back as strings when read
     * (see {@link CrSql#getPeerVersion}).
     *
     * @param siteId - peer site identifier (hex, 16 bytes)
     * @param version - peer database version (base‑10 string)
     * @param seq - peer sequence number associated with the version
     *
     * @since 0.0.0
     */
    const setPeerVersion = Effect.fn("@effect-native/crsql/setPeerVersion")(function*(
      siteId: CrSqlSchema.SiteIdHex,
      version: CrSqlSchema.VersionString,
      seq: number
    ) {
      yield* sql`
        INSERT OR REPLACE INTO crsql_tracked_peers (site_id, version, tag, event, seq)
        VALUES (unhex(${siteId}), CAST(${version} AS INTEGER), 0, 0, ${seq})
      `
    })

    /**
     * Reads the tracked version for a peer site from `crsql_tracked_peers`.
     *
     * Returns `null` when no row exists. The version is returned as a base‑10
     * string to avoid bigint precision issues; `seq` is a non‑negative integer.
     *
     * @param siteId - peer site identifier (hex, 16 bytes)
     * @returns `{ version: string, seq: number } | null`
     *
     * @since 0.0.0
     */
    const getPeerVersion = Effect.fn("@effect-native/crsql/getPeerVersion")(function*(
      siteId: CrSqlSchema.SiteIdHex
    ) {
      const rows = yield* sql<{
        version: CrSqlSchema.VersionString
        seq: number
      }>`SELECT CAST(version AS TEXT) as version, seq FROM crsql_tracked_peers WHERE site_id = unhex(${siteId})`

      // Return single object if found, null if not found (consistent with integration tests)
      return rows.length > 0 ? rows[0] : null
    })

    return {
      getSiteIdHex,
      getDbVersion,
      pullChanges,
      applyChanges,
      setPeerVersion,
      getPeerVersion
    }
  })
}) {}
