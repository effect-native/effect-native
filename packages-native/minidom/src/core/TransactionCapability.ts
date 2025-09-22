/**
 * Transactional capability helpers for MiniDom adapters.
 *
 * @since 0.0.0
 */
import * as Effect from "effect/Effect"

import * as MiniDomError from "./MiniDomError.js"

/**
 * Brand used to mark transactional capability values.
 *
 * @since 0.0.0
 * @category symbols
 */
export const MiniDomTransactionTypeId: unique symbol = Symbol.for("@effect-native/minidom/Transaction")

/**
 * Capability surface for running DOM operations within a transaction.
 *
 * @since 0.0.0
 * @category model
 */
export interface TransactionCapability<E = MiniDomError.Conflict> {
  readonly [MiniDomTransactionTypeId]: true
  readonly withTransaction: <R, A, EE>(
    effect: Effect.Effect<A, EE, R>
  ) => Effect.Effect<A, EE | E, R>
}

/**
 * Type guard for MiniDom transactional capabilities.
 *
 * @since 0.0.0
 * @category guards
 */
export const is = (u: unknown): u is TransactionCapability =>
  typeof u === "object" && u !== null && MiniDomTransactionTypeId in u

/**
 * Wraps a `withTransaction` handler with the MiniDom transaction brand.
 *
 * @since 0.0.0
 * @category constructors
 */
export const make = <E>(handler: TransactionCapability<E>["withTransaction"]): TransactionCapability<E> => ({
  [MiniDomTransactionTypeId]: true,
  withTransaction: handler
})

/**
 * Applies a transactional capability to an effect.
 *
 * @since 0.0.0
 * @category combinators
 */
export const run = <E, R, A, EE>(
  transaction: TransactionCapability<E>,
  effect: Effect.Effect<A, EE, R>
): Effect.Effect<A, EE | E, R> => transaction.withTransaction(effect)

/**
 * Curry helper for running a computation inside the provided capability.
 *
 * @since 0.0.0
 * @category combinators
 */
export const withTransaction =
  <E>(transaction: TransactionCapability<E>) =>
  <R, A, EE>(effect: Effect.Effect<A, EE, R>): Effect.Effect<A, EE | E, R> => transaction.withTransaction(effect)

/**
 * Creates a capability that always fails with {@link MiniDomError.Unsupported}.
 *
 * Useful for adapters that do not yet support transaction semantics.
 *
 * @since 0.0.0
 * @category constructors
 */
export const unsupported = (options?: {
  readonly message?: string
  readonly cause?: unknown
}): TransactionCapability<MiniDomError.Unsupported> =>
  make(() =>
    Effect.fail(
      new MiniDomError.Unsupported({
        message: options?.message ?? "MiniDom adapter does not support transactions",
        cause: options?.cause
      })
    )
  )

/**
 * Namespace export that collects the transaction helpers.
 *
 * @since 0.0.0
 * @category exports
 */
export const TransactionCapability = {
  TypeId: MiniDomTransactionTypeId,
  is,
  make,
  run,
  withTransaction,
  unsupported
}

/**
 * Alias export for {@link MiniDomTransactionTypeId} supporting named imports.
 *
 * @since 0.0.0
 * @category symbols
 */
export const TypeId = MiniDomTransactionTypeId
