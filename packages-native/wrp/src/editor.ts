import { spawn } from "node:child_process"
import * as Effect from "effect/Effect"

export const openInEditor = (editor: string, filePath: string) =>
  Effect.async<void, Error>((resume) => {
    const child = spawn(editor, [filePath], { stdio: "inherit" })
    child.on("error", (error) => resume(Effect.fail(error)))
    child.on("exit", (code) => {
      if (code === 0) {
        resume(Effect.succeed(undefined))
      } else {
        resume(Effect.fail(new Error(`Editor exited with code ${code}`)))
      }
    })
  })
