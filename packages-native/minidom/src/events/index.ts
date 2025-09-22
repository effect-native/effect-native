/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category symbols
 */
export const MiniDomEventsTypeId: unique symbol = Symbol.for("@effect-native/minidom/Events")

/**
 * @since 1.0.0
 * @category model
 */
export interface EventStream<E = never, A = unknown> {
  readonly [MiniDomEventsTypeId]: true
  readonly subscribe: (observer: {
    readonly onEvent: (value: A) => void
    readonly onError?: (error: E) => void
    readonly onEnd?: () => void
  }) => void
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const notImplemented = (): never => {
  throw new Error("MiniDom.Events not implemented yet")
}

/**
 * @since 1.0.0
 * @category exports
 */
export const Events = {
  TypeId: MiniDomEventsTypeId,
  notImplemented
}

/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId = MiniDomEventsTypeId
