/**
 * React host adapter facade for MiniDom.
 *
 * @since 0.0.0
 */

/**
 * Brand used by host adapter configurations.
 *
 * @since 0.0.0
 * @category symbols
 */
export const MiniDomHostTypeId: unique symbol = Symbol.for("@effect-native/minidom/Host")

/**
 * Marker interface implemented by MiniDom host adapter configs.
 *
 * @since 0.0.0
 * @category model
 */
export interface HostConfig {
  readonly [MiniDomHostTypeId]: true
}

/**
 * Placeholder helper for unimplemented host adapters.
 *
 * @since 0.0.0
 * @category constructors
 */
export const notImplemented = (): never => {
  throw new Error("MiniDom host adapter not implemented yet")
}

/**
 * Namespace export collecting host-related helpers.
 *
 * @since 0.0.0
 * @category exports
 */
export const Host = {
  TypeId: MiniDomHostTypeId,
  notImplemented
}

/**
 * Alias for {@link MiniDomHostTypeId} to support named imports.
 *
 * @since 0.0.0
 * @category symbols
 */
export const TypeId = MiniDomHostTypeId
