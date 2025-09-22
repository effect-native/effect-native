/**
 * Branded symbol that marks values as MiniDom handles.
 *
 * The symbol is attached to every handle created through {@link make} and allows
 * consumers to perform structural checks via {@link is}. Custom capability
 * implementations can also depend on the symbol to detect MiniDom handles that
 * originate from foreign adapters.
 *
 * @since 0.0.0
 * @category symbols
 */
export const MiniDomHandleTypeId: unique symbol = Symbol.for("@effect-native/minidom/Handle")

/**
 * Structural representation of an opaque MiniDom handle.
 *
 * Handles wrap adapter-specific node references while preventing consumers from
 * closing over the underlying data. The wrapper preserves the original value in
 * the {@link MiniDomHandle.value} field so that capability implementations can
 * still interact with it in a controlled fashion.
 *
 * @since 0.0.0
 * @category model
 */
export interface MiniDomHandle<Value = unknown> {
  readonly [MiniDomHandleTypeId]: true
  readonly value: Value
}

/**
 * Type guard that verifies whether a value carries the MiniDom handle brand.
 *
 * The guard only checks for the structural symbol and therefore works even if
 * the handle crossed an adapter or serialization boundary.
 *
 * @since 0.0.0
 * @category guards
 */
export const is = (u: unknown): u is MiniDomHandle => typeof u === "object" && u !== null && MiniDomHandleTypeId in u

/**
 * Constructs a branded MiniDom handle around an adapter-provided value.
 *
 * Handles preserve the original data while tagging it with
 * {@link MiniDomHandleTypeId}. This makes it trivial to verify ownership and to
 * serialize the underlying pointer when an adapter exposes custom transport
 * semantics.
 *
 * @since 0.0.0
 * @category constructors
 */
export const make = <Value>(value: Value): MiniDomHandle<Value> => ({
  [MiniDomHandleTypeId]: true,
  value
})

/**
 * Contract for registering handle-specific capabilities.
 *
 * Capabilities allow adapters to plug in equality semantics or provide
 * serialization hooks that are later consumed by the composite router.
 *
 * @since 0.0.0
 * @category model
 */
export interface HandleCapability {
  readonly equals: (a: MiniDomHandle, b: MiniDomHandle) => boolean
  readonly serialize?: (handle: MiniDomHandle) => unknown
  readonly deserialize?: (value: unknown) => MiniDomHandle
}

/**
 * Helper for defining {@link HandleCapability} instances with inference support.
 *
 * The function returns the provided capability unchanged, enabling callers to
 * benefit from contextual typing when building capability records.
 *
 * @since 0.0.0
 * @category constructors
 */
export const capability = <C extends HandleCapability>(definition: C): C => definition

/**
 * Namespace that groups the primary handle helpers for ergonomic imports.
 *
 * This mirror export enables patterns such as `import { Handle } from
 * "@effect-native/minidom"` while still allowing tree-shaking of individual
 * helpers.
 *
 * @since 0.0.0
 * @category exports
 */
export const Handle = {
  TypeId: MiniDomHandleTypeId,
  make,
  is,
  capability
}
