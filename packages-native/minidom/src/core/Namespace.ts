/**
 * Helpers for working with XML namespace-qualified names within MiniDom.
 *
 * @since 0.0.0
 */

/**
 * String literal namespace representation used throughout MiniDom.
 *
 * `null` represents the default HTML namespace; other values are explicit
 * namespace URIs.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import type { Namespace } from "@effect-native/minidom/core/Namespace"
 *
 * const html: Namespace = "http://www.w3.org/1999/xhtml"
 * const svg: Namespace = "http://www.w3.org/2000/svg"
 * const none: Namespace = null
 * ```
 */
export type Namespace = string | null

/**
 * Utility helpers for working with namespace-qualified attribute names.
 *
 * @since 0.0.0
 * @category constructors
 */
export const Namespace = {
  /**
   * Computes a stable map key for a namespace/name tuple.
   *
   * @since 0.0.0
   * @category constructors
   * @example
   * ```ts
   * import { Namespace } from "@effect-native/minidom"
   *
   * const key = Namespace.key("http://www.w3.org/1999/xhtml", "class")
   * console.log(key) // "http://www.w3.org/1999/xhtml|class"
   * ```
   */
  key(ns: Namespace, name: string): string {
    return `${ns ?? ""}|${name}`
  }
} as const
