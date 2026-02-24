/**
 * Absolute paths per platform to bundled extension binaries.
 *
 * @since 0.0.0
 */
import { fileURLToPath } from "node:url"

export const darwin_aarch64 = fileURLToPath(new URL("../lib/darwin-aarch64/sqlite3_graph_ext.dylib", import.meta.url))
export const darwin_x86_64 = fileURLToPath(new URL("../lib/darwin-x86_64/sqlite3_graph_ext.dylib", import.meta.url))
export const linux_aarch64 = fileURLToPath(new URL("../lib/linux-aarch64/sqlite3_graph_ext.so", import.meta.url))
export const linux_x86_64 = fileURLToPath(new URL("../lib/linux-x86_64/sqlite3_graph_ext.so", import.meta.url))
export const win_x86_64 = fileURLToPath(new URL("../lib/win-x86_64/sqlite3_graph_ext.dll", import.meta.url))
export const win_i686 = fileURLToPath(new URL("../lib/win-i686/sqlite3_graph_ext.dll", import.meta.url))

export type Paths = {
  readonly [K in
    | "darwin_aarch64"
    | "darwin_x86_64"
    | "linux_aarch64"
    | "linux_x86_64"
    | "win_x86_64"
    | "win_i686"]: string
}
