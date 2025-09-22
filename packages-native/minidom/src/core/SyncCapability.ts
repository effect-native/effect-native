/**
 * Detection helpers for synchronous MiniDom adapters.
 *
 * @since 0.0.0
 */
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"

/**
 * Branded symbol used to identify synchronous execution capabilities.
 *
 * @since 0.0.0
 * @category symbols
 */
export const MiniDomSyncTypeId: unique symbol = Symbol.for("@effect-native/minidom/Sync")

/**
 * Capability exposing synchronous execution for MiniDom effects.
 *
 * @since 0.0.0
 * @category model
 */
export interface SyncCapability {
  readonly [MiniDomSyncTypeId]: true
  readonly run: <A, E = never>(effect: Effect.Effect<A, E>) => A
}

/**
 * Determines whether an unknown value is a MiniDom sync capability.
 *
 * @since 0.0.0
 * @category guards
 */
export const is = (u: unknown): u is SyncCapability => typeof u === "object" && u !== null && MiniDomSyncTypeId in u

/**
 * Wraps an arbitrary effect runner with the MiniDom sync brand.
 *
 * @since 0.0.0
 * @category constructors
 */
export const fromRunner = (runner: SyncCapability["run"]): SyncCapability => ({
  [MiniDomSyncTypeId]: true,
  run: runner
})

/**
 * Detects whether an operation can be run synchronously and returns the
 * capability when possible.
 *
 * @since 0.0.0
 * @category constructors
 */
export const detect = <A>(operation: () => Effect.Effect<A>): Option.Option<SyncCapability> => {
  try {
    const exit = Effect.runSyncExit(operation())
    return Exit.isSuccess(exit)
      ? Option.some(fromRunner((effect) => Effect.runSync(effect)))
      : Option.none()
  } catch {
    return Option.none()
  }
}

/**
 * Namespace export that exposes the sync helper utilities.
 *
 * @since 0.0.0
 * @category exports
 */
// NOTE: Keeping a namespace-style export preserves the existing public API surface.
export const SyncCapability = {
  TypeId: MiniDomSyncTypeId,
  is,
  fromRunner,
  detect
}

/**
 * Alias for {@link MiniDomSyncTypeId} to support named imports.
 *
 * @since 0.0.0
 * @category symbols
 */
export const TypeId = MiniDomSyncTypeId
