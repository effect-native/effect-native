/**
 * @since 0.0.0
 */
import type * as Equal from "effect/Equal"
import type { Pipeable } from "effect/Pipeable"
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
export interface Thing<A> extends Pipeable, Equal.Equal {
  readonly [TypeId]: TypeId
  readonly id: string
  readonly label: string
  readonly value: A
  readonly tags: ReadonlyArray<string>
}

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
export const mapValue: typeof internal.mapValue = internal.mapValue

/**
 * @since 0.0.0
 * @category combinators
 */
export const addTag: typeof internal.addTag = internal.addTag

export type { ThingInput } from "./internal/thing.js"
