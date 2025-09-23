/**
 * @since 0.0.0
 */
import * as internal from "./internal/jsx.js"

/**
 * JSX Fragment symbol for `@jsxImportSource @effect-native/patterns`
 *
 * @since 0.0.0
 */
export const Fragment = internal.Fragment

/**
 * JSX factory for single child trees.
 *
 * @since 0.0.0
 */
export const jsx = internal.jsx

/**
 * JSX factory for multiple child trees.
 *
 * @since 0.0.0
 */
export const jsxs = internal.jsxs

export type { JsxElement, JsxKey, JsxProps, JsxRef } from "./internal/jsx.js"
