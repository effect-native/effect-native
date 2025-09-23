/**
 * @since 0.0.0
 */
import { dual } from "effect/Function"
import * as internal from "./internal/thing.js"

/**
 * @since 0.0.0
 * @category type id
 */
export const TypeId: typeof internal.TypeId = internal.TypeId

/**
 * @since 0.0.0
 * @category type id
 */
export type TypeId = internal.TypeId

/**
 * @since 0.0.0
 * @category models
 */
export interface Thing<A> extends internal.Thing<A> {}

/**
 * @since 0.0.0
 * @category constructors
 */
export const make: typeof internal.make = internal.make

/**
 * @since 0.0.0
 * @category refinements
 */
export const isThing: typeof internal.isThing = internal.isThing

/**
 * @since 0.0.0
 * @category combinators
 */
export const mapValue = dual<
  <A, B>(f: (value: A) => B) => (self: Thing<A>) => Thing<B>,
  <A, B>(self: Thing<A>, f: (value: A) => B) => Thing<B>
>(2, internal.mapValue)

/**
 * @since 0.0.0
 * @category combinators
 */
export const addTag = dual<
  (tag: string) => <A>(self: Thing<A>) => Thing<A>,
  <A>(self: Thing<A>, tag: string) => Thing<A>
>(2, internal.addTag)

export type { ThingInput } from "./internal/thing.js"
