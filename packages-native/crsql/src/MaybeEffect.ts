/**
 * Utilities for accepting either plain values or Effect computations.
 *
 * The helpers in this module make it straightforward to support APIs that can
 * consume already-computed values or lazily evaluate an Effect, normalizing the
 * result into an `Effect` when needed.
 *
 * @internal
 */
import { Effect } from "effect"

/**
 * A value that may already be an `Effect` or a plain value that can be lifted
 * into one.
 *
 * @internal
 */
export type MaybeEffect<A, E = never, R = never> = Effect.Effect<A, E, R> | A

// TODO: move to a separate package

/**
 * Normalizes a value or `Effect` into a consistent `Effect` interface.
 *
 * Passing `null` or `undefined` preserves the nullable result to simplify
 * optional parameters while still embracing Effect-based workflows.
 *
 * @internal
 */
export function MaybeEffect(self: null | undefined): null
export function MaybeEffect<A, E = never, R = never>(self: MaybeEffect<A, E, R>): Effect.Effect<A, E, R>
export function MaybeEffect<A, E = never, R = never>(self: MaybeEffect<A, E, R> | null | undefined) {
  if (self == null) {
    return null
  }
  if (Effect.isEffect(self)) {
    return self
  }
  return Effect.succeed(self)
}
