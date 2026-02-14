/**
 * Domain & NPM Package Name Availability Checker
 * Uses AI to suggest related names and checks them simultaneously
 */
import { OpenRouter } from "@effect-native/openrouter"
import { Console, Effect, Schema } from "effect"
import * as dns from "node:dns/promises"
import * as fs from "node:fs"
import * as path from "node:path"

// --- Config ---
export interface NameCheckConfig {
  ai: {
    model: string
    system: { prompt: string }
  }
  defaults: {
    suggestion_count: number
    check_tlds: Array<string>
  }
}

const DEFAULT_CONFIG: NameCheckConfig = {
  ai: {
    model: "google/gemini-2.0-flash-001",
    system: {
      prompt: `You are a creative naming assistant. Generate domain and npm package name suggestions.

Rules:
- Names must be valid for both domain names and npm packages
- Keep names short (ideally under 15 characters)
- Avoid hyphens when possible (domains work better without them)
- Be creative with wordplay, portmanteaus, and related concepts
- Consider memorability and pronounceability

Return JSON only, no explanation:
{"suggestions": [{"name": "example", "reason": "brief reason"}]}`
    }
  },
  defaults: {
    suggestion_count: 10,
    check_tlds: [".com", ".io", ".dev"]
  }
}

const findConfigFile = (): string | null => {
  // Walk up from cwd looking for .config/name-check/config.toml
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    const configPath = path.join(dir, ".config", "name-check", "config.toml")
    if (fs.existsSync(configPath)) return configPath
    dir = path.dirname(dir)
  }
  return null
}

let _config: NameCheckConfig | null = null

export const loadConfig = (): NameCheckConfig => {
  if (_config) return _config

  const configPath = findConfigFile()
  if (!configPath) {
    _config = DEFAULT_CONFIG
    return _config
  }

  try {
    const toml = fs.readFileSync(configPath, "utf-8")
    // Bun has built-in TOML support via Bun.TOML or we can use a simple parser
    // Since we're in bun, use Bun.TOML if available, otherwise parse manually
    if (typeof Bun !== "undefined" && Bun.TOML) {
      const parsed = Bun.TOML.parse(toml) as Partial<NameCheckConfig>
      _config = {
        ai: { ...DEFAULT_CONFIG.ai, ...parsed.ai },
        defaults: { ...DEFAULT_CONFIG.defaults, ...parsed.defaults }
      }
    } else {
      // Fallback: just use defaults (TOML parsing without Bun requires a library)
      _config = DEFAULT_CONFIG
    }
  } catch {
    _config = DEFAULT_CONFIG
  }

  return _config
}

// --- Schemas ---
const NameSuggestions = Schema.Struct({
  suggestions: Schema.Array(Schema.Struct({
    name: Schema.String,
    reason: Schema.String
  }))
})

export type AvailabilityResult = {
  name: string
  available: boolean | "unknown"
  method: "dns" | "npm"
}

export type NameCheckResult = {
  domain: AvailabilityResult
  domainIo: AvailabilityResult
  domainDev: AvailabilityResult
  npm: AvailabilityResult
  npmScoped: AvailabilityResult
}

// --- Domain Availability Check ---
export const checkDomainAvailable = (domain: string) =>
  Effect.tryPromise({
    try: async () => {
      try {
        await dns.lookup(domain)
        return { name: domain, available: false as const, method: "dns" as const }
      } catch (e: any) {
        if (e.code === "ENOTFOUND") {
          return { name: domain, available: true as const, method: "dns" as const }
        }
        throw e
      }
    },
    catch: () => ({ name: domain, available: "unknown" as const, method: "dns" as const })
  })

// --- NPM Package Availability Check ---
export const checkNpmAvailable = (name: string) =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
        method: "HEAD"
      })
      return { name, available: res.status === 404, method: "npm" as const }
    },
    catch: () => ({ name, available: "unknown" as const, method: "npm" as const })
  })

// --- AI Name Suggestions ---
export const getAiSuggestions = (baseName: string, count?: number) =>
  Effect.gen(function*() {
    const config = loadConfig()
    const suggestionCount = count ?? config.defaults.suggestion_count

    const openrouter = yield* OpenRouter
    const response = yield* openrouter.chat({
      model: config.ai.model,
      messages: [
        { role: "system", content: config.ai.system.prompt },
        {
          role: "user",
          content: `Generate ${suggestionCount} name suggestions for: "${baseName}"`
        }
      ]
    })
    const text = response.choices[0]?.message?.content ?? ""

    try {
      // Clean up potential markdown code blocks
      const cleaned = text.replace(/^```json\s*/m, "").replace(/^```\s*$/m, "").trim()
      const parsed = JSON.parse(cleaned)
      return Schema.decodeSync(NameSuggestions)(parsed).suggestions
    } catch (e) {
      yield* Console.log(`Failed to parse AI response (${e}): ${text.slice(0, 200)}...`)
      return []
    }
  })

// --- Main Checker ---
export const checkName = (name: string) =>
  Effect.all({
    domain: checkDomainAvailable(`${name}.com`),
    domainIo: checkDomainAvailable(`${name}.io`),
    domainDev: checkDomainAvailable(`${name}.dev`),
    npm: checkNpmAvailable(name),
    npmScoped: checkNpmAvailable(`@${name}/${name}`)
  }, { concurrency: "unbounded" })

export const formatResult = (name: string, results: NameCheckResult) => {
  const status = (r: { available: boolean | "unknown" }) =>
    r.available === true ?
      "\x1b[32m available\x1b[0m" :
      r.available === false ?
      "\x1b[31m taken\x1b[0m" :
      "\x1b[33m unknown\x1b[0m"

  return `
\x1b[1m${name}\x1b[0m
  .com:     ${status(results.domain)}
  .io:      ${status(results.domainIo)}
  .dev:     ${status(results.domainDev)}
  npm:      ${status(results.npm)}
  @scoped:  ${status(results.npmScoped)}`
}

// --- Full Check with AI ---
export const checkWithAiSuggestions = (baseName: string, suggestionCount = 10) =>
  Effect.gen(function*() {
    yield* Console.log(`\n\x1b[1;36mChecking: ${baseName}\x1b[0m`)

    const baseResults = yield* checkName(baseName)
    yield* Console.log(formatResult(baseName, baseResults))

    yield* Console.log("\n\x1b[1;36mGetting AI suggestions...\x1b[0m")
    const suggestions = yield* getAiSuggestions(baseName, suggestionCount)

    if (suggestions.length > 0) {
      yield* Console.log(`\nFound ${suggestions.length} suggestions:`)

      const allChecks = yield* Effect.all(
        suggestions.map((s) =>
          checkName(s.name).pipe(
            Effect.map((results) => ({ suggestion: s, results }))
          )
        ),
        { concurrency: 5 }
      )

      for (const { results, suggestion } of allChecks) {
        yield* Console.log(formatResult(`${suggestion.name} (${suggestion.reason})`, results))
      }

      return { base: { name: baseName, results: baseResults }, suggestions: allChecks }
    }

    return { base: { name: baseName, results: baseResults }, suggestions: [] }
  })
