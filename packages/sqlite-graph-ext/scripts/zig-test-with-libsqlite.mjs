import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const detectPlatformTag = () => {
  if (process.platform === "darwin" && process.arch === "arm64") return "darwin-aarch64"
  if (process.platform === "darwin" && process.arch === "x64") return "darwin-x86_64"
  if (process.platform === "linux" && process.arch === "arm64") return "linux-aarch64"
  if (process.platform === "linux" && process.arch === "x64") return "linux-x86_64"
  if (process.platform === "win32" && process.arch === "x64") return "win-x86_64"
  if (process.platform === "win32" && process.arch === "ia32") return "win-i686"
  throw new Error(`Unsupported runtime platform ${process.platform}-${process.arch}`)
}

const platform = detectPlatformTag()
const sqliteLibDir = path.resolve("..", "libsqlite", "lib", platform)
if (!fs.existsSync(sqliteLibDir)) {
  throw new Error(`Missing bundled libsqlite directory: ${sqliteLibDir}`)
}

const result = spawnSync("zig", ["test", "src/extension.zig", "-lc", "-L", sqliteLibDir, "-lsqlite3"], {
  stdio: "inherit"
})

process.exit(result.status ?? 1)
