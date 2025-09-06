#!/usr/bin/env node
/* global console */
import { spawnSync } from "node:child_process"
import process from "node:process"

const isWin = process.platform === "win32"

function have(cmd, args = ["--version"]) {
  try {
    const r = spawnSync(cmd, args, { stdio: "ignore" })
    return r.status === 0
  } catch {
    return false
  }
}

const haveNix = !isWin && have("nix", ["--version"])

if (!isWin && !haveNix) {
  console.error(
    "error: Nix is required on macOS/Linux. Run inside `nix develop`.\nSee AGENTS.md > Nix Development Environment."
  )
  process.exit(1)
}

function runStep(name, cmd, args) {
  let exec = cmd
  let finalArgs = args

  if (!isWin && haveNix) {
    exec = "nix"
    finalArgs = ["develop", "--command", cmd, ...args]
  }

  console.log(`\n==> ${name}`)
  const r = spawnSync(exec, finalArgs, { stdio: "inherit", env: process.env, shell: false })
  const code = typeof r.status === "number" ? r.status : 1
  if (code !== 0) {
    console.error(`step failed: ${name} (exit ${code})`)
  }
  return code
}

const steps = [
  { name: "test", cmd: "pnpm", args: ["test", "--run"] },
  { name: "lint-fix", cmd: "pnpm", args: ["lint-fix"] },
  { name: "check", cmd: "pnpm", args: ["check"] },
  { name: "circular", cmd: "pnpm", args: ["circular"] },
  { name: "codegen", cmd: "pnpm", args: ["codegen"] },
  { name: "test-types", cmd: "pnpm", args: ["test-types", "--target", "current"] },
  { name: "docgen", cmd: "pnpm", args: ["docgen"] },
  { name: "codemod", cmd: "pnpm", args: ["codemod"] },
  { name: "build", cmd: "pnpm", args: ["build"] },
  { name: "verify-subpaths", cmd: "node", args: ["scripts/verify-subpaths.mjs"] }
]

let total = 0
for (const s of steps) {
  total += runStep(s.name, s.cmd, s.args) || 0
}

if (total === 0) {
  console.log("\nAll steps passed ✅")
} else {
  console.error(`\nOne or more steps failed (aggregate ${total}).`)
}

process.exit(total)
