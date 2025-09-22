/**
 * MiniDom service tag and capability metadata.
 *
 * @since 0.0.0
 */
import * as Context from "effect/Context"

import type { Document } from "./Nodes.js"
import type { Sync as SyncCapability } from "./Sync.js"
import type { Transaction as TransactionCapability } from "./Transaction.js"

// NOTE: legacy naming retained for compatibility; tracked renames live in follow-up specs.
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
// NOTE: rename to a `MiniDom` alias is deferred to avoid churn in downstream packages.
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
// NOTE: context tag name mirrors the legacy `Service` namespace for API stability.
export class Tag extends Context.Tag("@effect-native/minidom/Service")<Tag, Service>() {}
