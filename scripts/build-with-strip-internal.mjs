#!/usr/bin/env node
import { spawn } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"

const tsconfigPath = "tsconfig.base.json"

const run = (cmd, args, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: false,
      env
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined)
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`))
      }
    })
  })

const original = await readFile(tsconfigPath, "utf8")

try {
  const config = JSON.parse(original)
  config.compilerOptions ??= {}
  config.compilerOptions.stripInternal = true
  await writeFile(tsconfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8")

  await run("bun", ["run", "build"])
} finally {
  await writeFile(tsconfigPath, original, "utf8")
}
