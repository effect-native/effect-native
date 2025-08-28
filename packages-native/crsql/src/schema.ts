import * as S from "effect/Schema"

// Basic hex string (uppercase or lowercase) used for site_id and pk
export const HexString = S.String.pipe(S.pattern(/^([0-9a-fA-F]{2})+$/))

// SiteId is 16 bytes => 32 hex chars
export const SiteIdHex = S.String.pipe(S.pattern(/^[0-9a-fA-F]{32}$/))
export type SiteIdHex = S.Schema.Type<typeof SiteIdHex>

// Version is a bigint serialized as a (base-10) string.
//
// There are generally two viable approaches for version fields in this codebase:
// 1) Transport (string) only: keep versions as base-10 strings everywhere (IO boundaries and in code).
//    - pro: avoids bigint parsing; matches what SQL returns via CAST(... AS TEXT)
//    - con: consumers must parse to bigint for arithmetic/comparisons
// 2) Parsed (bigint) in code + string at IO: use S.BigInt to decode a string -> bigint and encode bigint -> string.
//    - pro: safe arithmetic in code; precise type
//    - con: requires a transform step at IO boundaries
//
// In "Serialized" schemas we stick to strings to faithfully represent what crosses the boundary, then callers can
// optionally transform to a parsed representation using S.BigInt (see commented example below).
export const VersionString = S.String.pipe(
  S.pattern(/^[0-9]+$/),
  S.annotations({ identifier: "BigIntString", description: "bigint encoded as a base-10 string" })
)
export type VersionString = S.Schema.Type<typeof VersionString>

// Example for a parsed variant (not exported):
//
//   const Version = S.BigInt.pipe(S.nonNegativeBigInt())
//   type Version = S.Schema.Type<typeof Version> // bigint in code
//   type VersionEncoded = S.Schema.Encoded<typeof Version> // string at the boundary

// Column value type from SQLite typeof(): 'null' | 'text' | 'integer' | 'real' | 'blob'
export const SqlValueType = S.Literal("null", "text", "integer", "real", "blob")

// Simple SQL identifier: starts with letter or underscore, followed by letters, digits, or underscores
export const Identifier = S.String.pipe(S.pattern(/^[A-Za-z_][A-Za-z0-9_]*$/))

// Pre-serialized crsql_changes row for transport (IO boundary shape)
// - pk: hex string of BLOB pk
// - val: null | string | number
//     - if val_type === 'blob' then `val` is a hex string (SQL hex(val))
//     - if val_type in ('integer', 'real') then `val` is a number
//     - if val_type === 'text' then `val` is a string
// - col_version/db_version: string (CAST AS TEXT in SQL) — bigint encoded as base-10 string
// - site_id: hex string for site identity
// - cl/seq: non-negative integers
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

export type ChangeRowSerialized = S.Schema.Type<typeof ChangeRowSerialized>

// crsql_tracked_peers row (transport shape)
// - site_id: hex string (16 bytes)
// - version: string (CAST AS TEXT in SQL) -- bigint as string
// - seq: number (integer)
// Pre-serialized tracked peer row for transport (per-peer cursor)
// - version is bigint as string; seq is non-negative integer
export const TrackedPeerSerialized = S.Struct({
  site_id: SiteIdHex,
  version: VersionString,
  seq: S.NonNegativeInt
})

export type TrackedPeerSerialized = S.Schema.Type<typeof TrackedPeerSerialized>
