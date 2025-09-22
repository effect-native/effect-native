/**
 * Placeholder adapter describing a future key-value MiniDom integration.
 *
 * @since 0.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import * as MiniDomError from "../core/MiniDomError.js"
import type { Service as MiniDomService } from "../core/Service.js"
import * as Service from "../core/Service.js"

const unsupported = () =>
  new MiniDomError.Unsupported({
    message: "KvMiniDom adapter is not implemented yet"
  })

/**
 * Capability metadata advertised by the KV adapter stub.
 *
 * @since 0.0.0
 * @category metadata
 */
export const metadata = {
  id: "KvMiniDom",
  capabilities: {
    events: { status: "planned" as const },
    transaction: { status: "exploring" as const }
  }
} as const

/**
 * Failing constructor that signals the adapter has not been implemented yet.
 *
 * @since 0.0.0
 * @category constructors
 */
export const make = (): Effect.Effect<MiniDomService, MiniDomError.Unsupported> => Effect.fail(unsupported())

/**
 * Layer that currently fails with {@link MiniDomError.Unsupported}.
 *
 * @since 0.0.0
 * @category layers
 */
export const layer = Layer.effect(Service.Tag, make())

/**
 * Namespace export collecting the KV adapter stubs.
 *
 * @since 0.0.0
 * @category exports
 */
export const KvMiniDom = {
  metadata,
  make,
  layer
}
