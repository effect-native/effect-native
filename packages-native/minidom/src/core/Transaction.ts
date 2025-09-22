/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"

import * as MiniDomError from "./MiniDomError.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MiniDomTransactionTypeId: unique symbol = Symbol.for("@effect-native/minidom/Transaction")

/**
 * @since 1.0.0
 * @category model
 */
export interface Transaction<E = MiniDomError.Conflict> {
  readonly [MiniDomTransactionTypeId]: true
  readonly withTransaction: <R, A, EE>(
    effect: Effect.Effect<A, EE, R>
  ) => Effect.Effect<A, EE | E, R>
}

/**
 * @since 1.0.0
 * @category guards
 */
export const is = (u: unknown): u is Transaction => typeof u === "object" && u !== null && MiniDomTransactionTypeId in u

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <E>(handler: Transaction<E>["withTransaction"]): Transaction<E> => ({
  [MiniDomTransactionTypeId]: true,
  withTransaction: handler
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const run = <E, R, A, EE>(
  transaction: Transaction<E>,
  effect: Effect.Effect<A, EE, R>
): Effect.Effect<A, EE | E, R> => transaction.withTransaction(effect)

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsupported = (options?: {
  readonly message?: string
  readonly cause?: unknown
}): Transaction<MiniDomError.Unsupported> =>
  make(() =>
    Effect.fail(
      new MiniDomError.Unsupported({
        message: options?.message ?? "MiniDom adapter does not support transactions",
        cause: options?.cause
      })
    )
  )

/**
 * @since 1.0.0
 * @category exports
 */
export const Transaction = {
  TypeId: MiniDomTransactionTypeId,
  is,
  make,
  run,
  unsupported
}

/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId = MiniDomTransactionTypeId
