/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MiniDomSyncTypeId: unique symbol = Symbol.for("@effect-native/minidom/Sync")

/**
 * @since 1.0.0
 * @category model
 */
export interface Sync {
  readonly [MiniDomSyncTypeId]: true
  readonly run: <A, E = never>(effect: Effect.Effect<A, E>) => A
}

/**
 * @since 1.0.0
 * @category guards
 */
export const is = (u: unknown): u is Sync => typeof u === "object" && u !== null && MiniDomSyncTypeId in u

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromRunner = (runner: Sync["run"]): Sync => ({
  [MiniDomSyncTypeId]: true,
  run: runner
})

/**
 * @since 1.0.0
 * @category exports
 */
export const Sync = {
  TypeId: MiniDomSyncTypeId,
  is,
  fromRunner
}

/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId = MiniDomSyncTypeId
