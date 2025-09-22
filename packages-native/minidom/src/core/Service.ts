/**
 * @since 0.0.0
 */
import * as Context from "effect/Context"

import type { Document } from "./Nodes.js"
import type { Sync as SyncCapability } from "./Sync.js"
import type { Transaction as TransactionCapability } from "./Transaction.js"

/**
 * @since 0.0.0
 * @category capabilities
 */
export interface Capabilities {
  readonly sync?: SyncCapability
  readonly transaction?: TransactionCapability
}

/**
 * @since 0.0.0
 * @category model
 */
export interface Service {
  readonly window: Window | null
  readonly document: Document
  readonly capabilities: Capabilities
}

/**
 * @since 0.0.0
 * @category tags
 */
export class Tag extends Context.Tag("@effect-native/minidom/Service")<Tag, Service>() {}
