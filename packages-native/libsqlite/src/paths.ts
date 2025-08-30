/**
 * Absolute paths to bundled libsqlite3 for supported platforms.
 * @since 0.0.0
 * @category Paths
 * @example
 * import { linux_x86_64 } from "@effect-native/libsqlite/paths"
 * console.log(linux_x86_64.endsWith("libsqlite3.so")) // true
 */
export const darwin_aarch64: string = new URL("../lib/darwin-aarch64/libsqlite3.dylib", import.meta.url).pathname

/** @since 0.0.0 @category Paths */
export const darwin_x86_64: string = new URL("../lib/darwin-x86_64/libsqlite3.dylib", import.meta.url).pathname

/** @since 0.0.0 @category Paths */
export const linux_x86_64: string = new URL("../lib/linux-x86_64/libsqlite3.so", import.meta.url).pathname

/** @since 0.0.0 @category Paths */
export const linux_aarch64: string = new URL("../lib/linux-aarch64/libsqlite3.so", import.meta.url).pathname
