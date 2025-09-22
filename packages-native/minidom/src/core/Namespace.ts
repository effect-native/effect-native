/**
 * @since 0.0.0
 */

/**
 * @since 0.0.0
 * @category model
 */
export type Namespace = string | null

/**
 * @since 0.0.0
 * @category constructors
 */
export const Namespace = {
  /**
   * @since 0.0.0
   * @category constructors
   */
  key(ns: Namespace, name: string): string {
    return `${ns ?? ""}|${name}`
  }
} as const
