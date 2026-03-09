import { spawnSync } from "node:child_process"

const builds = [
  ["darwin-aarch64", "aarch64-macos"],
  ["darwin-x86_64", "x86_64-macos"],
  ["linux-aarch64", "aarch64-linux-gnu"],
  ["linux-x86_64", "x86_64-linux-gnu"],
  ["win-i686", "x86-windows-gnu"],
  ["win-x86_64", "x86_64-windows-gnu"]
]

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: import.meta.dirname + "/..",
    stdio: "inherit",
    env: process.env
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

for (const [platform, target] of builds) {
  console.log(`rebuilding ${platform} (${target})`)
  run("zig", ["build", `-Dtarget=${target}`, "-Doptimize=ReleaseSafe"])
  run(process.execPath, ["./scripts/copy-graph-ext-artifacts.mjs", platform])
}
