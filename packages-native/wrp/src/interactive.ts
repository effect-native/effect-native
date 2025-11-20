import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import YAML from "yaml"
import { type AnyNode } from "./model.js"

export const runInputPrompt = (message: string) =>
  Effect.tryPromise({
    try: async () => {
      const rl = createInterface({ input: stdin, output: stdout })
      const answer = await rl.question(`${message} `)
      rl.close()
      return answer
    },
    catch: (error) => error as Error
  })

export const runEvaluationPrompt = (node: AnyNode) =>
  Effect.gen(function*() {
    const evaluation = node.evaluation
    if (!evaluation || evaluation.reproLevel !== "manual-human") {
      return
    }
    yield* Console.log(`Evaluation for ${node.id}`)
    yield* Console.log(`Time budget: ${evaluation.manual.timeBudgetMinutes} minutes`)
    yield* Console.log(`Difficulty: ${evaluation.manual.difficulty}`)
    let index = 1
    for (const step of evaluation.manual.steps) {
      yield* Console.log(`${index}. ${step.description}`)
      yield* Console.log(`   Expected: ${step.expected}`)
      index += 1
    }
  })

export const showNodeDetails = (node: AnyNode) =>
  Effect.gen(function*() {
    const { body = "", ...frontmatter } = node
    const yaml = YAML.stringify(frontmatter, { lineWidth: 120 }).trimEnd()
    yield* Console.log(`---\n${yaml}\n---`)
    if (body.trim().length > 0) {
      yield* Console.log("")
      yield* Console.log(body)
    }
  })
