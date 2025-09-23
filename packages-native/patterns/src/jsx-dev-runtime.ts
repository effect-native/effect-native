/**
 * @since 0.0.0
 */
import * as internal from "./internal/jsx.js"

/**
 * JSX Fragment symbol for dev builds.
 *
 * @since 0.0.0
 */
export const Fragment = internal.Fragment

/**
 * JSX factory with source metadata for dev builds.
 *
 * @since 0.0.0
 */
export const jsxDEV = internal.jsxDEV

export type { JsxElement, JsxKey, JsxProps, JsxRef } from "./internal/jsx.js"
