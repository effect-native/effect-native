import * as ChildProcess from "node:child_process"
import * as Fs from "node:fs"
import * as Path from "node:path"

function run(command, args, cwd) {
  const result = ChildProcess.spawnSync(command, args, {
    cwd,
    stdio: "inherit"
  })

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")} (code ${result.status})`)
  }
}

const packagesDir = Path.join(process.cwd(), "packages")
const packageDirs = Fs.readdirSync(packagesDir, { withFileTypes: true })

for (const dir of packageDirs) {
  if (!dir.isDirectory()) continue

  const packagePath = Path.join(packagesDir, dir.name)
  const docgenConfig = Path.join(packagePath, "docgen.json")

  if (Fs.existsSync(docgenConfig)) {
    run("bunx", ["@effect/docgen"], packagePath)
  }
}

run("bun", ["scripts/docs.mjs"], process.cwd())
