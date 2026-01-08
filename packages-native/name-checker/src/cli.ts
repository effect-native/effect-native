#!/usr/bin/env npx tsx
import { Console, Effect, Fiber, Schedule } from "effect"
import { OpenRouter } from "@effect-native/openrouter"
import { enableDevFetchCache } from "@effect-native/fetch-hooks"
import { checkName, formatResult, getAiSuggestions, type NameCheckResult } from "./index.js"
import * as readline from "node:readline"

// Enable fetch caching for idempotency
enableDevFetchCache()

type CheckedName = { name: string; reason?: string; results: NameCheckResult }

const readStdin = Effect.async<string>((resume) => {
  if (process.stdin.isTTY) {
    resume(Effect.succeed(""))
    return
  }
  let data = ""
  process.stdin.setEncoding("utf8")
  process.stdin.on("data", (chunk) => { data += chunk })
  process.stdin.on("end", () => resume(Effect.succeed(data.trim())))
  process.stdin.on("error", (err) => resume(Effect.fail(err)))
})

const progressBar = (seconds: number, label: string) =>
  Effect.gen(function*() {
    const width = 30
    const totalMs = seconds * 1000
    const intervalMs = 100
    const steps = totalMs / intervalMs

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const filled = Math.round(progress * width)
      const empty = width - filled
      const bar = "█".repeat(filled) + "░".repeat(empty)
      const remaining = Math.ceil((steps - i) * intervalMs / 1000)
      process.stdout.write(`\r\x1b[90m${label} [${bar}] ${remaining}s (Ctrl+C to stop)\x1b[0m`)
      yield* Effect.sleep(intervalMs)
    }
    process.stdout.write("\r" + " ".repeat(80) + "\r")
  })

const waitWithAbort = (seconds: number, label: string) =>
  Effect.gen(function*() {
    const progressFiber = yield* progressBar(seconds, label).pipe(Effect.fork)
    
    // Set up abort listener
    let aborted = false
    const abortHandler = () => { aborted = true }
    process.once("SIGINT", abortHandler)
    
    // Poll for abort while waiting
    const checkAbort = Effect.gen(function*() {
      while (!aborted) {
        const status = yield* Fiber.status(progressFiber)
        if (status._tag === "Done") break
        yield* Effect.sleep(50)
      }
      if (aborted) {
        yield* Fiber.interrupt(progressFiber)
      }
    })
    
    yield* checkAbort
    process.removeListener("SIGINT", abortHandler)
    
    return !aborted
  })

const formatCompactResult = (name: string, results: NameCheckResult, reason?: string) => {
  const s = (r: { available: boolean | "unknown" }) =>
    r.available === true ? "\x1b[32m✓\x1b[0m" :
    r.available === false ? "\x1b[31m✗\x1b[0m" :
    "\x1b[33m?\x1b[0m"
  
  const reasonStr = reason ? ` \x1b[90m(${reason})\x1b[0m` : ""
  return `  ${s(results.domain)}.com ${s(results.domainIo)}.io ${s(results.domainDev)}.dev ${s(results.npm)}npm ${s(results.npmScoped)}@scope  \x1b[1m${name}\x1b[0m${reasonStr}`
}

const singleRoundSearch = (description: string) =>
  Effect.gen(function*() {
    yield* Console.log(`\n\x1b[1;36mSearching names for: "${description}"\x1b[0m`)
    yield* Console.log(`\x1b[90mLegend: ✓=available ✗=taken ?=unknown\x1b[0m\n`)

    const suggestions = yield* getAiSuggestions(description, 10)
    
    if (suggestions.length === 0) {
      yield* Console.log("\x1b[33mNo suggestions from AI\x1b[0m")
      return
    }

    const checkResults = yield* Effect.all(
      suggestions.map(s =>
        checkName(s.name).pipe(
          Effect.map(results => ({ name: s.name, reason: s.reason, results }))
        )
      ),
      { concurrency: 5 }
    )

    for (const item of checkResults) {
      yield* Console.log(formatCompactResult(item.name, item.results, item.reason))
    }

    yield* Console.log("")
  })

const interactiveSearch = (description: string) =>
  Effect.gen(function*() {
    const allChecked = new Map<string, CheckedName>()
    const MAX_ROUNDS = 10
    
    yield* Console.log(`\n\x1b[1;36mSearching names for: "${description}"\x1b[0m`)
    yield* Console.log(`\x1b[90mLegend: ✓=available ✗=taken ?=unknown\x1b[0m\n`)

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      yield* Console.log(`\x1b[1;35m── Round ${round}/${MAX_ROUNDS} ──\x1b[0m`)
      
      // Get AI suggestions based on description + what we've already seen
      const alreadyChecked = Array.from(allChecked.keys())
      const prompt = alreadyChecked.length > 0
        ? `${description}\n\nAlready suggested (don't repeat): ${alreadyChecked.join(", ")}`
        : description
      
      const suggestions = yield* getAiSuggestions(prompt, 10)
      
      if (suggestions.length === 0) {
        yield* Console.log("\x1b[33mNo new suggestions from AI\x1b[0m")
        continue
      }

      // Filter out already checked names
      const newSuggestions = suggestions.filter(s => !allChecked.has(s.name.toLowerCase()))
      
      if (newSuggestions.length === 0) {
        yield* Console.log("\x1b[33mAll suggestions already checked\x1b[0m")
        continue
      }

      // Check all new names in parallel
      const checkResults = yield* Effect.all(
        newSuggestions.map(s =>
          checkName(s.name).pipe(
            Effect.map(results => ({ name: s.name, reason: s.reason, results }))
          )
        ),
        { concurrency: 5 }
      )

      // Display and store results
      for (const item of checkResults) {
        allChecked.set(item.name.toLowerCase(), item)
        yield* Console.log(formatCompactResult(item.name, item.results, item.reason))
      }

      // Show summary of available names so far
      const available = Array.from(allChecked.values()).filter(c => 
        c.results.domain.available === true || 
        c.results.domainIo.available === true ||
        c.results.npm.available === true
      )
      yield* Console.log(`\n\x1b[90mTotal checked: ${allChecked.size} | With availability: ${available.length}\x1b[0m`)

      // Wait before next round (unless last round)
      if (round < MAX_ROUNDS) {
        const shouldContinue = yield* waitWithAbort(10, "Next round in")
        if (!shouldContinue) {
          yield* Console.log("\n\x1b[33mStopped by user\x1b[0m")
          break
        }
      }
    }

    // Final summary
    yield* Console.log("\n\x1b[1;36m══ Final Results ══\x1b[0m")
    
    const fullyAvailable = Array.from(allChecked.values()).filter(c =>
      c.results.domain.available === true &&
      c.results.npm.available === true
    )
    
    if (fullyAvailable.length > 0) {
      yield* Console.log("\n\x1b[1;32mFully available (.com + npm):\x1b[0m")
      for (const item of fullyAvailable) {
        yield* Console.log(formatCompactResult(item.name, item.results, item.reason))
      }
    }

    const partialAvailable = Array.from(allChecked.values()).filter(c =>
      (c.results.domain.available === true || c.results.domainIo.available === true || c.results.domainDev.available === true) &&
      c.results.npm.available === true &&
      !fullyAvailable.includes(c)
    )
    
    if (partialAvailable.length > 0) {
      yield* Console.log("\n\x1b[1;33mPartially available (some domain + npm):\x1b[0m")
      for (const item of partialAvailable) {
        yield* Console.log(formatCompactResult(item.name, item.results, item.reason))
      }
    }

    yield* Console.log("")
  })

const isInteractive = process.stdout.isTTY === true

const main = Effect.gen(function*() {
  const stdinInput = yield* readStdin
  const args = process.argv.slice(2)
  
  // Handle piped input
  if (stdinInput) {
    if (isInteractive) {
      yield* interactiveSearch(stdinInput)
    } else {
      yield* singleRoundSearch(stdinInput)
    }
    return
  }

  if (args.length === 0) {
    yield* Console.log("Usage:")
    yield* Console.log("  name-check <name> [name2] ...            Check specific names")
    yield* Console.log("  name-check \"long description\"            AI search based on description")
    yield* Console.log("  name-check <name> --ai                   Check name + AI suggestions")
    yield* Console.log("  echo \"description\" | name-check          AI search (piped input)")
    yield* Console.log("")
    yield* Console.log("Examples:")
    yield* Console.log("  name-check myapp coolproject")
    yield* Console.log("  name-check \"a minimal state container\"")
    yield* Console.log("  name-check myproject --ai")
    return
  }

  const useAi = args.includes("--ai")
  const names = args.filter((a) => a !== "--ai")

  // Detect if input looks like a description (contains spaces) vs exact names to check
  const isDescription = names.length === 1 && names[0].includes(" ")

  if (isDescription) {
    // Treat as a description for AI search
    if (isInteractive) {
      yield* interactiveSearch(names[0])
    } else {
      yield* singleRoundSearch(names[0])
    }
  } else if (useAi && names.length === 1) {
    if (isInteractive) {
      yield* interactiveSearch(names[0])
    } else {
      yield* singleRoundSearch(names[0])
    }
  } else if (useAi) {
    for (const name of names) {
      if (isInteractive) {
        yield* interactiveSearch(name)
      } else {
        yield* singleRoundSearch(name)
      }
    }
  } else {
    // Simple check without AI - exact names only
    const checkResults = yield* Effect.all(
      names.map((n) => checkName(n).pipe(Effect.map((r) => ({ name: n, results: r })))),
      { concurrency: "unbounded" }
    )

    for (const item of checkResults) {
      yield* Console.log(formatResult(item.name, item.results))
    }
    yield* Console.log("")
  }
})

const program = main.pipe(Effect.provide(OpenRouter.Default))

Effect.runPromise(program).catch(console.error)
