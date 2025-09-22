/**
 * Tagged error hierarchy used by MiniDom to communicate failures.
 *
 * Every exported error class extends {@link effect/Data!Data.TaggedError} to
 * retain rich context while integrating with Effect's error channel.
 *
 * @since 0.0.0
 */
import * as Data from "effect/Data"

// NOTE: constructors explicitly add the MiniDom error brand for reliable runtime guards.

/**
 * Unique symbol brand shared by all MiniDom error instances.
 *
 * The brand allows consumers to write defensive guards that accept any error
 * emitted from MiniDom regardless of the concrete tagged type.
 *
 * @since 0.0.0
 * @category symbols
 */
export const MiniDomErrorTypeId: unique symbol = Symbol.for("@effect-native/minidom/MiniDomError")

interface BaseErrorShape {
  readonly message: string
  readonly cause?: unknown
}

const withTypeId = <A extends BaseErrorShape>(fields: A): A & { readonly [MiniDomErrorTypeId]: true } => ({
  [MiniDomErrorTypeId]: true,
  ...fields
})

/**
 * Error emitted when DOM content violates a declared schema.
 *
 * Attach Effect Schema issues to {@link SchemaViolation} instances so that
 * callers can render actionable feedback for document authors.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import { MiniDomError } from "@effect-native/minidom"
 *
 * throw new MiniDomError.SchemaViolation({
 *   message: "<title> is required",
 *   issues: [{ path: ["head", "title"], message: "missing" }]
 * })
 * ```
 */
export class SchemaViolation extends Data.TaggedError("SchemaViolation")<
  {
    readonly message: string
    readonly cause?: unknown
    readonly issues?: ReadonlyArray<unknown>
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown; readonly issues?: ReadonlyArray<unknown> }) {
    super(withTypeId(input))
  }
}

/**
 * Error produced when adapters encounter a backend failure.
 *
 * Typical scenarios include network outages for remote adapters or native
 * bridge exceptions on mobile platforms.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import { MiniDomError } from "@effect-native/minidom"
 *
 * const error = new MiniDomError.BackendFailure({
 *   message: "POST /dom-sync responded with 503"
 * })
 * console.error(error._tag) // "BackendFailure"
 * ```
 */
export class BackendFailure extends Data.TaggedError("BackendFailure")<
  {
    readonly message: string
    readonly cause?: unknown
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown }) {
    super(withTypeId(input))
  }
}

/**
 * Error raised whenever a transactional operation detects a conflict.
 *
 * Use the optional {@link Conflict.handle} field to surface which element
 * triggered the conflict in optimistic concurrency flows.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import { MiniDomError } from "@effect-native/minidom"
 *
 * throw new MiniDomError.Conflict({
 *   message: "Node changed while refreshing",
 *   handle: { nodeId: "42" }
 * })
 * ```
 */
export class Conflict extends Data.TaggedError("Conflict")<
  {
    readonly message: string
    readonly cause?: unknown
    readonly handle?: unknown
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown; readonly handle?: unknown }) {
    super(withTypeId(input))
  }
}

/**
 * Error used when an adapter lacks the capability required by the caller.
 *
 * MiniDom surfaces {@link Unsupported} errors to help downstream consumers fall
 * back gracefully or prompt users to switch adapters.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import { MiniDomError } from "@effect-native/minidom"
 *
 * throw new MiniDomError.Unsupported({
 *   message: "Adapter does not implement transactions"
 * })
 * ```
 */
export class Unsupported extends Data.TaggedError("Unsupported")<
  {
    readonly message: string
    readonly cause?: unknown
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown }) {
    super(withTypeId(input))
  }
}

/**
 * Error triggered when the observation layer fails to deliver updates.
 *
 * Common causes include stream disconnections or invalidation loops that
 * prevented a query from resuming.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import { MiniDomError } from "@effect-native/minidom"
 *
 * throw new MiniDomError.ObservationFailure({
 *   message: "mailbox watcher exited early"
 * })
 * ```
 */
export class ObservationFailure extends Data.TaggedError("ObservationFailure")<
  {
    readonly message: string
    readonly cause?: unknown
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown }) {
    super(withTypeId(input))
  }
}

/**
 * Determines whether an unknown value originates from the MiniDom error family.
 *
 * The guard is particularly useful in Effect pipelines where errors may include
 * foreign types such as native DOM exceptions.
 *
 * @since 0.0.0
 * @category guards
 */
export const isMiniDomError = (u: unknown): u is MiniDomError =>
  typeof u === "object" && u !== null && MiniDomErrorTypeId in u

/**
 * Union type covering every error the MiniDom package may emit.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import type { MiniDomError } from "@effect-native/minidom/core/MiniDomError"
 *
 * const log = (error: MiniDomError) => {
 *   console.error(error._tag, error.message)
 * }
 * ```
 */
export type MiniDomError =
  | SchemaViolation
  | BackendFailure
  | Conflict
  | Unsupported
  | ObservationFailure

/**
 * Convenience namespace that re-exports the MiniDom error classes and helpers.
 *
 * @since 0.0.0
 * @category exports
 */
export const MiniDomError = {
  TypeId: MiniDomErrorTypeId,
  SchemaViolation,
  BackendFailure,
  Conflict,
  Unsupported,
  ObservationFailure,
  is: isMiniDomError
}

/**
 * Alias export that mirrors {@link MiniDomErrorTypeId} for ergonomics.
 *
 * @since 0.0.0
 * @category symbols
 */
export const TypeId = MiniDomErrorTypeId
