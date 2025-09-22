/**
 * @since 0.0.0
 */
import * as Data from "effect/Data"

/**
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
 * @since 0.0.0
 * @category model
 */
export class SchemaViolation extends Data.TaggedError("SchemaViolation")<
  {
    readonly _tag: "SchemaViolation"
    readonly reason: "schema-violation"
    readonly message: string
    readonly cause?: unknown
    readonly issues?: ReadonlyArray<unknown>
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown; readonly issues?: ReadonlyArray<unknown> }) {
    super(
      withTypeId({
        _tag: "SchemaViolation" as const,
        reason: "schema-violation" as const,
        ...input
      })
    )
  }
}

/**
 * @since 0.0.0
 * @category model
 */
export class BackendFailure extends Data.TaggedError("BackendFailure")<
  {
    readonly _tag: "BackendFailure"
    readonly reason: "backend-failure"
    readonly message: string
    readonly cause?: unknown
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown }) {
    super(
      withTypeId({
        _tag: "BackendFailure" as const,
        reason: "backend-failure" as const,
        ...input
      })
    )
  }
}

/**
 * @since 0.0.0
 * @category model
 */
export class Conflict extends Data.TaggedError("Conflict")<
  {
    readonly _tag: "Conflict"
    readonly reason: "conflict"
    readonly message: string
    readonly cause?: unknown
    readonly handle?: unknown
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown; readonly handle?: unknown }) {
    super(
      withTypeId({
        _tag: "Conflict" as const,
        reason: "conflict" as const,
        ...input
      })
    )
  }
}

/**
 * @since 0.0.0
 * @category model
 */
export class Unsupported extends Data.TaggedError("Unsupported")<
  {
    readonly _tag: "Unsupported"
    readonly reason: "unsupported"
    readonly message: string
    readonly cause?: unknown
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown }) {
    super(
      withTypeId({
        _tag: "Unsupported" as const,
        reason: "unsupported" as const,
        ...input
      })
    )
  }
}

/**
 * @since 0.0.0
 * @category model
 */
export class ObservationFailure extends Data.TaggedError("ObservationFailure")<
  {
    readonly _tag: "ObservationFailure"
    readonly reason: "observation-failure"
    readonly message: string
    readonly cause?: unknown
    readonly [MiniDomErrorTypeId]: true
  }
> {
  constructor(input: { readonly message: string; readonly cause?: unknown }) {
    super(
      withTypeId({
        _tag: "ObservationFailure" as const,
        reason: "observation-failure" as const,
        ...input
      })
    )
  }
}

/**
 * @since 0.0.0
 * @category guards
 */
export const isMiniDomError = (u: unknown): u is MiniDomError =>
  typeof u === "object" && u !== null && MiniDomErrorTypeId in u

/**
 * @since 0.0.0
 * @category model
 */
export type MiniDomError =
  | SchemaViolation
  | BackendFailure
  | Conflict
  | Unsupported
  | ObservationFailure

/**
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
 * @since 0.0.0
 * @category symbols
 */
export const TypeId = MiniDomErrorTypeId
