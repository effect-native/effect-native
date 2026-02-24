#!/usr/bin/env node
import { spawn } from "node:child_process"
import { performance } from "node:perf_hooks"

const steps = [
  {
    name: "Install dependencies (frozen lockfile)",
    cmd: "bun",
    args: ["install", "--frozen-lockfile"]
  },
  {
    name: "Lint",
    cmd: "bun",
    args: ["run", "lint"]
  },
  {
    name: "Codegen",
    cmd: "bun",
    args: ["run", "codegen"]
  },
  {
    name: "Typecheck",
    cmd: "bun",
    args: ["run", "check"]
  },
  {
    name: "Typecheck (tsgo)",
    cmd: "bun",
    args: ["run", "check:tsgo"]
  },
  {
    name: "Circular dependencies",
    cmd: "bun",
    args: ["run", "circular"]
  },
  {
    name: "Type tests",
    cmd: "bun",
    args: ["run", "test-types", "--target", ">=5.4"]
  },
  {
    name: "Codemod",
    cmd: "bun",
    args: ["run", "codemod"]
  },
  {
    name: "Tests (CI mode)",
    cmd: "bun",
    args: ["run", "test"],
    env: { CI: "true" }
  },
  {
    name: "Verify pack assets",
    cmd: "bun",
    args: ["run", "verify-pack-assets"]
  },
  {
    name: "Build (stripInternal=true)",
    cmd: "bun",
    args: ["run", "build:strip-internal"]
  },
  {
    name: "Verify subpaths",
    cmd: "bun",
    args: ["run", "verify-subpaths"]
  },
  {
    name: "Docgen",
    cmd: "bun",
    args: ["run", "docgen"]
  }
]

const run = (step) =>
  new Promise((resolve, reject) => {
    const started = performance.now()
    const env = step.env
      ? {
        ...process.env,
        ...step.env
      }
      : process.env

    const child = spawn(step.cmd, step.args, {
      stdio: "inherit",
      shell: false,
      env
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      const elapsedMs = Math.round(performance.now() - started)
      if (code === 0) {
        resolve(elapsedMs)
      } else {
        reject(new Error(`${step.cmd} ${step.args.join(" ")} exited with code ${code} (${elapsedMs}ms)`))
      }
    })
  })

for (const step of steps) {
  console.log(`\n==> ${step.name}`)
  const elapsedMs = await run(step)
  console.log(`✔ ${step.name} (${elapsedMs}ms)`)
}

console.log("\nAll local CI-equivalent checks passed.")
