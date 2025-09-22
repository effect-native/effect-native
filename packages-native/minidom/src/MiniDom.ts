/**
 * MiniDom service tag and capability metadata.
 *
 * @since 0.0.0
 */
import * as Context from "effect/Context"

import * as Effect from "effect/Effect"
import type * as Nodes from "./core/Nodes.js"
import type { SyncCapability } from "./core/SyncCapability.js"
import type { TransactionCapability } from "./core/TransactionCapability.js"

/**
 * Runtime entry point for interacting with a MiniDom environment.
 *
 * The service exposes the current `document`, an optional `window`, and the
 * adapter capability metadata.
 *
 * @since 0.0.0
 * @category model
 */
export class MiniDom extends Context.Tag("@effect-native/minidom/MiniDom")<MiniDom, {
  readonly window: Window | null
  readonly document: Nodes.Document
  readonly capabilities: {
    readonly sync?: SyncCapability
    readonly transaction?: TransactionCapability
  }
}>() {}

export const window = Effect.gen(function*() {
  const dom = yield* MiniDom
  return dom.window
})

export const document = Effect.gen(function*() {
  const dom = yield* MiniDom
  return dom.document
})

export const capabilities = Effect.gen(function*() {
  const dom = yield* MiniDom
  return dom.document
})
