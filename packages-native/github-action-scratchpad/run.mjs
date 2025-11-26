#!/usr/bin/env node
/**
 * Wrapper script to run main.ts with experimental-transform-types enabled.
 * This allows .js imports to be resolved to .ts files.
 */
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const mainTs = join(__dirname, "main.ts")

const child = spawn(
  process.execPath,
  ["--experimental-transform-types", mainTs],
  {
    stdio: "inherit",
    env: process.env
  }
)

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
