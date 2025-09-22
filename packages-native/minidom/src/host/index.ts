/**
 * @since 0.0.0
 */

/**
 * @since 0.0.0
 * @category symbols
 */
export const MiniDomHostTypeId: unique symbol = Symbol.for("@effect-native/minidom/Host")

/**
 * @since 0.0.0
 * @category model
 */
export interface HostConfig {
  readonly [MiniDomHostTypeId]: true
}

/**
 * @since 0.0.0
 * @category constructors
 */
export const notImplemented = (): never => {
  throw new Error("MiniDom host adapter not implemented yet")
}

/**
 * @since 0.0.0
 * @category exports
 */
export const Host = {
  TypeId: MiniDomHostTypeId,
  notImplemented
}

/**
 * @since 0.0.0
 * @category symbols
 */
export const TypeId = MiniDomHostTypeId
