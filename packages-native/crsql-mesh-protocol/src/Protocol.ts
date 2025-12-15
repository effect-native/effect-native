/**
 * Protocol layer with unhex() capability check.
 *
 * @since 0.1.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import { Context, Effect, Layer } from "effect"
import * as ProtocolError from "./ProtocolError.js"

/**
 * Protocol service interface.
 *
 * The protocol service is a marker that indicates the unhex() capability check
 * has passed and the protocol is safe to use with this SQLite connection.
 *
 * @since 0.1.0
 * @category Service
 */
export interface ProtocolService {
  readonly _tag: "Protocol"
}

/**
 * Protocol service tag.
 *
 * @since 0.1.0
 * @category Service
 */
export class Protocol extends Context.Tag("@effect-native/crsql-mesh-protocol/Protocol")<
  Protocol,
  ProtocolService
>() {}

/**
 * Check if unhex() is available in SQLite.
 *
 * @since 0.1.0
 * @category Internal
 */
const checkUnhexCapability = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  // Try to execute unhex() - if it fails, the function is unavailable
  const result = yield* sql`SELECT unhex('48656C6C6F') AS test`.pipe(
    Effect.map((rows) => rows.length > 0),
    Effect.catchAll((cause) => Effect.fail(new ProtocolError.UnhexUnavailable({ cause })))
  )
  if (!result) {
    yield* Effect.fail(new ProtocolError.UnhexUnavailable())
  }
})

/**
 * Protocol layer that performs the unhex() capability check.
 *
 * Requires a SqlClient in context. Fails with UnhexUnavailable if the
 * capability check fails.
 *
 * @since 0.1.0
 * @category Layer
 */
export const layer: Layer.Layer<Protocol, ProtocolError.UnhexUnavailable, SqlClient.SqlClient> = Layer.effect(
  Protocol,
  Effect.gen(function*() {
    yield* checkUnhexCapability
    return { _tag: "Protocol" as const }
  })
)
