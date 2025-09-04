#!/usr/bin/env node
/**
 * CLI script for running multi-runtime tests
 * 
 * Usage: pnpm test:multi-runtime [testPattern] [--runtimes node18,node20,bun,browser]
 */
import { Effect, Console } from "effect"
import { 
  MultiRuntimeTestRunnerLive, 
  runMultiRuntimeTestsParallel,
  defaultRuntimes,
  type RuntimeConfig
} from "../src/index.js"

interface CliArgs {
  testPattern: string
  runtimes: string[]
  parallel: boolean
}

const parseArgs = (): CliArgs => {
  const args = process.argv.slice(2)
  const testPattern = args[0] || "**/*.test.{ts,js}"
  
  const runtimesArg = args.find(arg => arg.startsWith("--runtimes="))?.slice("--runtimes=".length)
  const runtimes = runtimesArg ? runtimesArg.split(",") : ["node18", "node20", "bun"]
  
  const parallel = args.includes("--parallel")
  
  return { testPattern, runtimes, parallel }
}

const parseRuntimeConfig = (runtime: string): RuntimeConfig => {
  switch (runtime.toLowerCase()) {
    case "node16":
      return defaultRuntimes.node("16")
    case "node18":
      return defaultRuntimes.node("18")  
    case "node20":
      return defaultRuntimes.node("20")
    case "node":
      return defaultRuntimes.node()
    case "bun":
      return defaultRuntimes.bun
    case "browser":
      return defaultRuntimes.browser
    default:
      throw new Error(`Unknown runtime: ${runtime}`)
  }
}

const formatResults = (results: ReadonlyArray<any>) => {
  console.log("\n" + "=".repeat(50))
  console.log("Multi-Runtime Test Results")
  console.log("=".repeat(50))
  
  let overallSuccess = true
  
  for (const result of results) {
    const status = result.success ? "✅ PASSED" : "❌ FAILED"
    const runtime = `${result.runtime.name}${result.runtime.version ? ` v${result.runtime.version}` : ""}`
    const duration = `${result.duration}ms`
    
    console.log(`${status} ${runtime} (${duration})`)
    
    if (result.testResults) {
      console.log(`  Tests: ${result.testResults.total} total, ${result.testResults.passed} passed, ${result.testResults.failed} failed`)
    }
    
    if (!result.success) {
      overallSuccess = false
      console.log("  Output:")
      console.log(result.output.split("\n").map((line: string) => `    ${line}`).join("\n"))
    }
  }
  
  console.log("=".repeat(50))
  console.log(`Overall: ${overallSuccess ? "✅ ALL PASSED" : "❌ SOME FAILED"}`)
  console.log("=".repeat(50) + "\n")
  
  return overallSuccess
}

const main = Effect.gen(function* () {
  const { testPattern, runtimes, parallel } = parseArgs()
  
  yield* Console.log(`Running tests with pattern: ${testPattern}`)
  yield* Console.log(`Runtimes: ${runtimes.join(", ")}`)
  yield* Console.log(`Mode: ${parallel ? "parallel" : "sequential"}`)
  
  const runtimeConfigs = runtimes.map(parseRuntimeConfig)
  
  const results = yield* runMultiRuntimeTestsParallel(testPattern, runtimeConfigs)
  
  const success = formatResults(results)
  
  if (!success) {
    yield* Effect.fail(new Error("Some tests failed"))
  }
  
  return results
})

// Run the program
Effect.runPromise(
  main.pipe(
    Effect.provide(MultiRuntimeTestRunnerLive)
  )
).then(
  () => process.exit(0),
  (error) => {
    console.error("Error:", error)
    process.exit(1)
  }
)