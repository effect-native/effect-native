/**
 * @since 1.0.0
 */
/**
 * @since 1.0.0
 * @category symbols
 */
export const MiniDomHandleTypeId: unique symbol = Symbol.for("@effect-native/minidom/Handle")

/**
 * @since 1.0.0
 * @category model
 */
export interface MiniDomHandle<Value = unknown> {
  readonly [MiniDomHandleTypeId]: true
  readonly value: Value
}

/**
 * @since 1.0.0
 * @category guards
 */
export const is = (u: unknown): u is MiniDomHandle => typeof u === "object" && u !== null && MiniDomHandleTypeId in u

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Value>(value: Value): MiniDomHandle<Value> => ({
  [MiniDomHandleTypeId]: true,
  value
})

/**
 * @since 1.0.0
 * @category model
 */
export interface HandleCapability {
  readonly equals: (a: MiniDomHandle, b: MiniDomHandle) => boolean
  readonly serialize?: (handle: MiniDomHandle) => unknown
  readonly deserialize?: (value: unknown) => MiniDomHandle
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const capability = <C extends HandleCapability>(definition: C): C => definition

/**
 * @since 1.0.0
 * @category exports
 */
export const Handle = {
  TypeId: MiniDomHandleTypeId,
  make,
  is,
  capability
}
