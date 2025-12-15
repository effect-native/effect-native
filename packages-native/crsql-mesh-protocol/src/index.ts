/**
 * Transport-agnostic message vocabulary for CR-SQLite mesh synchronization.
 *
 * This package defines the shared language that all mesh participants speak,
 * regardless of what runtime they execute on or what transport they use to
 * communicate. It provides:
 *
 * - Message schemas for version summaries, diff requests, and diff responses
 * - A protocol layer with unhex() capability checking
 * - Encode/decode helpers with typed error handling
 *
 * @since 0.1.0
 * @example
 * ```typescript
 * import * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
 * import * as Protocol from "@effect-native/crsql-mesh-protocol/Protocol"
 * import { Effect, Schema as S } from "effect"
 *
 * // Decode an incoming message
 * const program = Effect.gen(function*() {
 *   const rawMessage = { kind: "VersionSummary", ... }
 *   const message = yield* Messages.decodeMeshMessage(rawMessage)
 *   // Handle the message...
 * })
 * ```
 */

/**
 * Protocol message schemas and types.
 *
 * @since 0.1.0
 */
export * as Messages from "./Messages.js"

/**
 * Protocol layer with unhex() capability check.
 *
 * @since 0.1.0
 */
export * as Protocol from "./Protocol.js"

/**
 * Error types for the mesh protocol.
 *
 * @since 0.1.0
 */
export * as ProtocolError from "./ProtocolError.js"
