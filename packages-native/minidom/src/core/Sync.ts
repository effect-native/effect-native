/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"

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
 * @category constructors
 */
export const detect = <A>(operation: () => Effect.Effect<A>): Option.Option<Sync> => {
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
 * @since 1.0.0
 * @category exports
 */
export const Sync = {
  TypeId: MiniDomSyncTypeId,
  is,
  fromRunner,
  detect
}

/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId = MiniDomSyncTypeId
