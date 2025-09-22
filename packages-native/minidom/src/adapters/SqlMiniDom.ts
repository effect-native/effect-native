/**
 * Placeholder adapter for future SQL-backed MiniDom implementations.
 *
 * @since 0.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import * as MiniDomError from "../core/MiniDomError.js"
import * as MiniDom from "../MiniDom.js"

const unsupported = () =>
  new MiniDomError.Unsupported({
    message: "SqlMiniDom adapter is not implemented yet"
  })

/**
 * Capability metadata advertised by the SQL adapter stub.
 *
 * @since 0.0.0
 * @category metadata
 */
export const metadata = {
  id: "SqlMiniDom",
  capabilities: {
    transaction: { status: "planned" as const },
    events: { status: "planned" as const }
  }
} as const

/**
 * Failing constructor that signals the adapter has not been implemented yet.
 *
 * @since 0.0.0
 * @category constructors
 */
export const make = () => Effect.fail(unsupported())

/**
 * Layer that fails with {@link MiniDomError.Unsupported} until implementation lands.
 *
 * @since 0.0.0
 * @category layers
 */
export const layer = Layer.effect(MiniDom.MiniDom, make())

/**
 * Namespace export collecting the SQL adapter stubs.
 *
 * @since 0.0.0
 * @category exports
 */
export const SqlMiniDom = {
  metadata,
  make,
  layer
}
