/**
 * Schema definitions for CR-SQLite change tracking and serialization.
 *
 * This module provides Effect Schema definitions for CR-SQLite data structures,
 * including change rows, tracked peers, and various identifier types used
 * throughout the CR-SQLite system.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
 * import { Schema as S } from "effect"
 *
 * // Validate a change row from CR-SQLite
 * const changeRow = {
 *   table: "users",
 *   pk: "1A2B3C4D",
 *   cid: "name",
 *   val: "Alice",
 *   val_type: "text",
 *   col_version: "1",
 *   db_version: "1",
 *   site_id: "A1B2C3D4E5F6789012345678ABCDEF90",
 *   cl: 0,
 *   seq: 0
 * }
 *
 * const decoded = S.decodeUnknownSync(CrSqlSchema.ChangeRowSerialized)(changeRow)
 * ```
 */
import * as S from "effect/Schema"

/**
 * Basic hex string pattern (uppercase or lowercase) used for site_id and pk values.
 *
 * @since 1.0.0
 * @category Schema
 */
export const HexString = S.String.pipe(S.pattern(/^([0-9a-fA-F]{2})+$/))

/**
 * Site ID as a 32-character hex string (16 bytes).
 *
 * @since 1.0.0
 * @category Schema
 */
export const SiteIdHex = S.String.pipe(S.pattern(/^[0-9a-fA-F]{32}$/))

/**
 * @since 1.0.0
 * @category Models
 */
export type SiteIdHex = typeof SiteIdHex.Type

/**
 * Version string schema for CR-SQLite version fields.
 *
 * Represents a bigint serialized as a base-10 string. There are two viable approaches
 * for version fields in this codebase:
 *
 * 1) Transport (string) only: keep versions as base-10 strings everywhere
 *    - Pro: avoids bigint parsing; matches SQL CAST(... AS TEXT) output
 *    - Con: consumers must parse to bigint for arithmetic/comparisons
 *
 * 2) Parsed (bigint) in code + string at IO: use S.BigInt transformations
 *    - Pro: safe arithmetic in code; precise type
 *    - Con: requires transform step at IO boundaries
 *
 * In "Serialized" schemas we use strings to faithfully represent boundary data.
 *
 * @since 1.0.0
 * @category Schema
 */
export const VersionString = S.String.pipe(
  S.pattern(/^[0-9]+$/),
  S.annotations({ identifier: "BigIntString", description: "bigint encoded as a base-10 string" })
)

/**
 * @since 1.0.0
 * @category Models
 */
export type VersionString = typeof VersionString.Type

// Example for a parsed variant (not exported):
//
//   const Version = S.BigInt.pipe(S.nonNegativeBigInt())
//   type Version = typeof Version> // bigint in cod.Type
//   type VersionEncoded = S.Schema.Encoded<typeof Version> // string at the boundary

/**
 * SQLite column value type from typeof() function.
 *
 * @since 1.0.0
 * @category Schema
 */
export const SqlValueType = S.Literal("null", "text", "integer", "real", "blob")

/**
 * Simple SQL identifier pattern.
 *
 * Must start with letter or underscore, followed by letters, digits, or underscores.
 *
 * @since 1.0.0
 * @category Schema
 */
export const Identifier = S.String.pipe(S.pattern(/^[A-Za-z_][A-Za-z0-9_]*$/))

/**
 * Pre-serialized crsql_changes row for transport (IO boundary shape).
 *
 * Represents a change row as returned by CR-SQLite with all fields serialized
 * for transport across boundaries:
 *
 * - `pk`: hex string of BLOB primary key
 * - `val`: null | string | number based on val_type:
 *   - if val_type === 'blob' then `val` is a hex string (SQL hex(val))
 *   - if val_type in ('integer', 'real') then `val` is a number
 *   - if val_type === 'text' then `val` is a string
 * - `col_version`/`db_version`: bigint encoded as base-10 string (CAST AS TEXT in SQL)
 * - `site_id`: hex string for site identity
 * - `cl`/`seq`: non-negative integers
 *
 * @since 1.0.0
 * @category Schema
 */
export const ChangeRowSerialized = S.Struct({
  table: Identifier.pipe(
    S.annotations({ description: "CRR table name (SQL identifier)" })
  ),
  pk: HexString.pipe(
    S.annotations({ description: "Primary key as hex-encoded BLOB" })
  ),
  cid: Identifier.pipe(
    S.annotations({ description: "Column id/name (SQL identifier)" })
  ),
  val: S.Union(S.Null, S.String, S.Number).pipe(
    S.annotations({
      description:
        "Value serialized from SQL: null | string | number. If val_type=blob, this is a hex string; if integer/real, a number; if text, a string"
    })
  ),
  val_type: SqlValueType.pipe(
    S.annotations({ description: "SQLite typeof(val): null | text | integer | real | blob" })
  ),
  col_version: VersionString.pipe(
    S.annotations({ description: "Column version (bigint) as base-10 string" })
  ),
  db_version: VersionString.pipe(
    S.annotations({ description: "Database version (bigint) as base-10 string" })
  ),
  site_id: SiteIdHex.pipe(
    S.annotations({ description: "Site id as 32‑char hex (16 bytes)" })
  ),
  cl: S.NonNegativeInt.pipe(
    S.annotations({
      description: "Causal length: the causal depth at the origin when this change was produced.\n" +
        "Represents how many prior changes were causally visible; useful for debugging\n" +
        "and advanced conflict policies. Most clients do not need to act on this field."
    })
  ),
  seq: S.NonNegativeInt.pipe(
    S.annotations({
      description: "Sequence number: within-version ordering for rows that share the same db_version.\n" +
        "Together, (db_version, seq) provides a deterministic total order for pull/apply."
    })
  )
}).pipe(
  S.annotations({
    identifier: "ChangeRowSerialized",
    description: "CR-SQLite change row as serialized by SQL (hex strings, bigint values as strings)"
  })
)

/**
 * @since 1.0.0
 * @category Models
 */
export type ChangeRowSerialized = typeof ChangeRowSerialized.Type

/**
 * Pre-serialized crsql_tracked_peers row for transport (per-peer cursor).
 *
 * Represents a tracked peer as returned by CR-SQLite with serialized fields:
 * - `site_id`: hex string (16 bytes)
 * - `version`: bigint encoded as base-10 string (CAST AS TEXT in SQL)
 * - `seq`: non-negative integer
 *
 * @since 1.0.0
 * @category Schema
 */
export const TrackedPeerSerialized = S.Struct({
  site_id: SiteIdHex,
  version: VersionString,
  seq: S.NonNegativeInt
})

/**
 * @since 1.0.0
 * @category Models
 */
export type TrackedPeerSerialized = typeof TrackedPeerSerialized.Type

/**
 * Complete information about a loaded CR-SQLite extension.
 *
 * Contains both SQL-queryable information (SHA, site ID) and loading metadata
 * (filesystem path, timestamp). Used when the extension has been successfully
 * loaded and is ready for use.
 *
 * @since 1.0.0
 * @category Schema
 */
export const ExtInfo = S.Struct({
  sha: S.String.annotations({ description: "Git commit SHA of the cr-sqlite extension" }),
  siteId: SiteIdHex,
  path: S.NullOr(S.String).annotations({ description: "Filesystem path to the loaded extension, if any" }),
  loadedAt: S.DateTimeUtcFromDate.annotations({ description: "Timestamp when the extension was loaded" })
}).annotations({ description: "Info about the cr-sqlite extension" })

/**
 * @since 1.0.0
 * @category Models
 */
export type ExtInfo = typeof ExtInfo.Type

/**
 * SQL-queryable information about the CR-SQLite extension.
 *
 * Contains only the information that can be retrieved by querying the
 * extension directly via SQL functions like `crsql_sha()` and `crsql_site_id()`.
 * Does not include loading metadata like filesystem path or timestamp.
 *
 * @since 1.0.0
 * @category Schema
 */
export const ExtInfoSql = ExtInfo.pick("sha", "siteId").annotations({
  description: "Info from querying the cr-sqlite extension"
})

/**
 * @since 1.0.0
 * @category Models
 */
export type ExtInfoSql = typeof ExtInfoSql.Type

/**
 * Loading metadata for the CR-SQLite extension.
 *
 * Contains information about when and from where the extension was loaded,
 * but not the SQL-queryable information like SHA or site ID. Useful for
 * debugging and auditing extension loading operations.
 *
 * @since 1.0.0
 * @category Schema
 */
export const ExtInfoLoaded = ExtInfo.pick("path", "loadedAt").annotations({
  description: "Info about loading the cr-sqlite extension"
})

/**
 * @since 1.0.0
 * @category Models
 */
export type ExtInfoLoaded = typeof ExtInfoLoaded.Type
