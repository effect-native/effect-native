/**
 * @since 0.0.0
 */
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"

/**
 * @since 0.0.0
 * @category symbols
 */
export const MiniDomSyncTypeId: unique symbol = Symbol.for("@effect-native/minidom/Sync")

/**
 * @since 0.0.0
 * @category model
 */
export interface Sync {
  readonly [MiniDomSyncTypeId]: true
  readonly run: <A, E = never>(effect: Effect.Effect<A, E>) => A
}

/**
 * @since 0.0.0
 * @category guards
 */
export const is = (u: unknown): u is Sync => typeof u === "object" && u !== null && MiniDomSyncTypeId in u

/**
 * @since 0.0.0
 * @category constructors
 */
export const fromRunner = (runner: Sync["run"]): Sync => ({
  [MiniDomSyncTypeId]: true,
  run: runner
})

/**
 * @since 0.0.0
 * @category constructors
 */
/**
 * @since 0.0.0
 * @category constructors
 * @example
 * ```ts
 * import { AttributeBag, Sync } from "@effect-native/minidom"
 * import * as Effect from "effect/Effect"
 * import * as Option from "effect/Option"
 *
 * const program = Effect.gen(function*() {
 *   const bag = AttributeBag.make()
 *   yield* bag.set(null, "id", "root")
 *   const snapshot = yield* bag.snapshot()
 *   return snapshot.size
 * })
 *
 * const capability = Sync.detect(() => program)
 *
 * Option.match(capability, {
 *   onNone: () => console.log("adapter is async"),
 *   onSome: (sync) => console.log("size", sync.run(program))
 * })
 * ```
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
 * @since 0.0.0
 * @category exports
 */
export const Sync = {
  TypeId: MiniDomSyncTypeId,
  is,
  fromRunner,
  detect
}

/**
 * @since 0.0.0
 * @category symbols
 */
export const TypeId = MiniDomSyncTypeId
