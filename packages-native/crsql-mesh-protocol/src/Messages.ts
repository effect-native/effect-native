/**
 * Protocol message schemas and types.
 *
 * Defines the message vocabulary for anti-entropy synchronization between
 * CR-SQLite peers. Reuses schema vocabulary from `@effect-native/crsql/CrSqlSchema`.
 *
 * @since 0.1.0
 */
import { Effect, ParseResult } from "effect"
import * as S from "effect/Schema"
import * as ProtocolError from "./ProtocolError.js"

/**
 * Site ID as a 32-character hex string (16 bytes).
 * Re-exported from CrSqlSchema pattern for protocol use.
 *
 * @since 0.1.0
 * @category Schema
 */
export const SiteIdHex = S.String.pipe(S.pattern(/^[0-9a-fA-F]{32}$/))

/**
 * @since 0.1.0
 * @category Models
 */
export type SiteIdHex = typeof SiteIdHex.Type

/**
 * Version string schema for CR-SQLite version fields.
 * Re-exported from CrSqlSchema pattern for protocol use.
 *
 * @since 0.1.0
 * @category Schema
 */
export const VersionString = S.String.pipe(
  S.pattern(/^[0-9]+$/),
  S.annotations({ identifier: "BigIntString", description: "bigint encoded as a base-10 string" })
)

/**
 * @since 0.1.0
 * @category Models
 */
export type VersionString = typeof VersionString.Type

/**
 * Simple SQL identifier pattern.
 *
 * @since 0.1.0
 * @category Schema
 */
const Identifier = S.String.pipe(S.pattern(/^[A-Za-z_][A-Za-z0-9_]*$/))

/**
 * Basic hex string pattern (uppercase or lowercase).
 *
 * @since 0.1.0
 * @category Schema
 */
const HexString = S.String.pipe(S.pattern(/^([0-9a-fA-F]{2})+$/))

/**
 * SQLite column value type from typeof() function.
 *
 * @since 0.1.0
 * @category Schema
 */
const SqlValueType = S.Literal("null", "text", "integer", "real", "blob")

/**
 * Pre-serialized crsql_changes row for transport (IO boundary shape).
 * Mirrors CrSqlSchema.ChangeRowSerialized.
 *
 * @since 0.1.0
 * @category Schema
 */
export const ChangeRowSerialized = S.Struct({
  table: Identifier,
  pk: HexString,
  cid: Identifier,
  val: S.Union(S.Null, S.String, S.Number),
  val_type: SqlValueType,
  col_version: VersionString,
  db_version: VersionString,
  site_id: SiteIdHex,
  cl: S.NonNegativeInt,
  seq: S.NonNegativeInt
}).annotations({
  identifier: "ChangeRowSerialized",
  description: "CR-SQLite change row as serialized by SQL"
})

/**
 * @since 0.1.0
 * @category Models
 */
export type ChangeRowSerialized = typeof ChangeRowSerialized.Type

/**
 * A map from site IDs to the highest db_version known for each site.
 *
 * @since 0.1.0
 * @category Schema
 */
export const PeersMap = S.Record({
  key: S.String.pipe(S.pattern(/^[0-9a-fA-F]{32}$/)),
  value: S.String.pipe(S.pattern(/^[0-9]+$/))
}).annotations({
  identifier: "PeersMap",
  description: "Map of site IDs to their highest known db_version"
})

/**
 * @since 0.1.0
 * @category Models
 */
export type PeersMap = typeof PeersMap.Type

/**
 * Version vector summary describing what data a peer has seen.
 *
 * Used by peers to communicate their current state so that other peers
 * can compute what changes need to be sent.
 *
 * @since 0.1.0
 * @category Schema
 */
export const VersionSummary = S.Struct({
  localSiteId: SiteIdHex.annotations({
    description: "The site ID of the peer sending this summary"
  }),
  peers: PeersMap.annotations({
    description: "Map of known site IDs to their highest known db_version"
  })
}).annotations({
  identifier: "VersionSummary",
  description: "Compact statement of what data versions a peer has seen"
})

/**
 * @since 0.1.0
 * @category Models
 */
export type VersionSummary = typeof VersionSummary.Type

/**
 * Request for missing changes from a peer.
 *
 * The sender includes their version summary so the receiver can compute
 * which changes the sender is missing.
 *
 * @since 0.1.0
 * @category Schema
 */
export const DiffRequest = S.Struct({
  summary: VersionSummary.annotations({
    description: "The requester's current version summary"
  }),
  maxChangeRows: S.optional(S.NonNegativeInt).annotations({
    description: "Optional batch size limit for the response"
  })
}).annotations({
  identifier: "DiffRequest",
  description: "Request for missing changes based on version summary"
})

/**
 * @since 0.1.0
 * @category Models
 */
export type DiffRequest = typeof DiffRequest.Type

/**
 * Response containing change rows that the requester is missing.
 *
 * @since 0.1.0
 * @category Schema
 */
export const DiffResponse = S.Struct({
  changeRows: S.Array(ChangeRowSerialized).annotations({
    description: "Batch of change rows the requester is missing"
  }),
  hasMore: S.Boolean.annotations({
    description: "True if more changes are available beyond this batch"
  }),
  summary: VersionSummary.annotations({
    description: "The sender's version summary after selecting this batch"
  })
}).annotations({
  identifier: "DiffResponse",
  description: "Response containing missing change rows"
})

/**
 * @since 0.1.0
 * @category Models
 */
export type DiffResponse = typeof DiffResponse.Type

/**
 * Mesh protocol message envelope.
 *
 * Wraps all protocol messages with metadata for routing and deduplication.
 *
 * @since 0.1.0
 * @category Schema
 */
export const MeshMessage = S.Struct({
  kind: S.Literal("VersionSummary", "DiffRequest", "DiffResponse").annotations({
    description: "Discriminator for the payload type"
  }),
  seq: S.NonNegativeInt.annotations({
    description: "Monotonic sequence number for deduplication"
  }),
  sender: SiteIdHex.annotations({
    description: "Site ID of the message sender"
  }),
  payload: S.Union(VersionSummary, DiffRequest, DiffResponse).annotations({
    description: "The message payload"
  })
}).annotations({
  identifier: "MeshMessage",
  description: "Protocol message envelope with metadata"
})

/**
 * @since 0.1.0
 * @category Models
 */
export type MeshMessage = typeof MeshMessage.Type

// Internal helper to wrap ParseError as ProtocolError
const wrapParseError = <A>(
  effect: Effect.Effect<A, ParseResult.ParseError>
): Effect.Effect<A, ProtocolError.ProtocolError> =>
  Effect.mapError(effect, (parseError) =>
    new ProtocolError.ProtocolError({
      message: ParseResult.TreeFormatter.formatErrorSync(parseError),
      cause: parseError
    }))

/**
 * Decode and validate a VersionSummary from unknown input.
 *
 * @since 0.1.0
 * @category Decode
 */
export const decodeVersionSummary = (
  input: unknown
): Effect.Effect<VersionSummary, ProtocolError.ProtocolError> => wrapParseError(S.decodeUnknown(VersionSummary)(input))

/**
 * Decode and validate a DiffRequest from unknown input.
 *
 * @since 0.1.0
 * @category Decode
 */
export const decodeDiffRequest = (
  input: unknown
): Effect.Effect<DiffRequest, ProtocolError.ProtocolError> => wrapParseError(S.decodeUnknown(DiffRequest)(input))

/**
 * Decode and validate a DiffResponse from unknown input.
 *
 * @since 0.1.0
 * @category Decode
 */
export const decodeDiffResponse = (
  input: unknown
): Effect.Effect<DiffResponse, ProtocolError.ProtocolError> => wrapParseError(S.decodeUnknown(DiffResponse)(input))

/**
 * Decode and validate a MeshMessage from unknown input.
 *
 * @since 0.1.0
 * @category Decode
 */
export const decodeMeshMessage = (
  input: unknown
): Effect.Effect<MeshMessage, ProtocolError.ProtocolError> => wrapParseError(S.decodeUnknown(MeshMessage)(input))
