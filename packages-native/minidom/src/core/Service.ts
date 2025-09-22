/**
 * MiniDom service tag and capability metadata.
 *
 * @since 0.0.0
 */
import * as Context from "effect/Context"

import type { Document } from "./Nodes.js"
import type { Sync as SyncCapability } from "./Sync.js"
import type { Transaction as TransactionCapability } from "./Transaction.js"

// TODO: rename Service -> MiniDom (module rename tracked separately)
/**
 * Capability switches supported by a MiniDom service implementation.
 *
 * @since 0.0.0
 * @category capabilities
 */
export interface Capabilities {
  readonly sync?: SyncCapability
  readonly transaction?: TransactionCapability
}

/**
 * Runtime entry point for interacting with a MiniDom environment.
 *
 * The service exposes the current `document`, an optional `window`, and the
 * adapter capability metadata.
 *
 * @since 0.0.0
 * @category model
 */
// TODO: rename Service -> MiniDom
export interface Service {
  readonly window: Window | null
  readonly document: Document
  readonly capabilities: Capabilities
}

/**
 * Context tag for accessing a MiniDom {@link Service}.
 *
 * @since 0.0.0
 * @category tags
 */
// TODO: rename Tag -> MiniDom
export class Tag extends Context.Tag("@effect-native/minidom/Service")<Tag, Service>() {}
