/**
 * @effect-native/repo-gaps
 * AI-powered spec/implementation gap analysis via git hooks
 */
import { OpenRouter } from "@effect-native/openrouter"
import { $ } from "bun"
import { Console, Effect } from "effect"
import { glob } from "glob"
import * as fs from "node:fs/promises"
import * as path from "node:path"

export const AUTO_COMMIT_MARKER = "[auto]"

export const readFile = (packageDir: string, filePath: string) =>
  Effect.tryPromise({
    try: () => fs.readFile(path.join(packageDir, filePath), "utf-8"),
    catch: () => ""
  })

export const writeFile = (packageDir: string, filePath: string, content: string) =>
  Effect.tryPromise({
    try: () => fs.writeFile(path.join(packageDir, filePath), content),
    catch: (e) => {
      throw new Error(`Failed to write ${filePath}: ${e}`)
    }
  })

export const readImplementationFiles = (packageDir: string, patterns = ["src/**/*.ts"]) =>
  Effect.tryPromise({
    try: async () => {
      const allFiles: Array<string> = []
      for (const pattern of patterns) {
        const files = await glob(pattern, { cwd: packageDir })
        for (const file of files) {
          allFiles.push(file)
        }
      }
      const contents = await Promise.all(
        allFiles.map(async (file) => {
          const content = await fs.readFile(path.join(packageDir, file), "utf-8")
          return `## ${file}\n\`\`\`typescript\n${content}\n\`\`\``
        })
      )
      return contents.join("\n\n") || "[No implementation files yet]"
    },
    catch: () => "[No implementation files yet]"
  })

/** Scan `.ok/rules/` and return paths of all SPEC.md files relative to packageDir */
export const findRuleSpecs = (packageDir: string) =>
  Effect.tryPromise({
    try: () => glob(".ok/rules/*/SPEC.md", { cwd: packageDir }),
    catch: () => [] as Array<string>
  })

export const getLastCommitMessage = (cwd: string) =>
  Effect.tryPromise({
    try: async () => {
      const result = await $`git log -1 --format=%s`.cwd(cwd).text()
      return result.trim()
    },
    catch: () => ""
  })

export const autoCommit = (cwd: string, files: Array<string>, message: string) =>
  Effect.tryPromise({
    try: async () => {
      await $`git add ${files}`.cwd(cwd)
      const status = await $`git diff --cached --name-only`.cwd(cwd).text()
      if (status.trim()) {
        await $`git commit -m ${AUTO_COMMIT_MARKER + " " + message}`.cwd(cwd)
        return true
      }
      return false
    },
    catch: () => false
  })

export const GAPS_PROMPT = `You are a technical analyst comparing a specification document to its implementation.

Your task:
1. Review the existing gap files to understand previously identified issues
2. Check if any previously identified gaps have been RESOLVED in the current implementation
3. Identify any NEW gaps where the implementation doesn't match the spec
4. Identify where implementation goes beyond what the spec requires (informational)
5. Identify potential issues (security, correctness, etc.)
6. Prioritize by severity (security > correctness > UX > informational)

Format your response as a structured markdown document with:
- A header "# GAPS.md — Gaps Between Spec and Implementation"
- A "## Resolved" section listing gaps from previous analysis that are now fixed (with brief explanation)
- Clear sections for "Spec Requires, Impl Missing", "Impl Does, Spec Doesn't Specify", and "Potential Issues"
- A summary table with ID, Description, Severity, Status (open/resolved), and whether impl change is needed
- Recommended priority list at the end

If there is no implementation yet, focus on what WILL need to be implemented based on the spec.

Preserve GAP IDs from the previous analysis when the gap still exists.
Be specific - cite exact spec sections and exact implementation line behaviors.
Do NOT invent issues that don't exist. Be precise and factual.`

export const SPEC_QA_PROMPT =
  `You are a specification analyst reviewing a behavioral specification for completeness and clarity.

Your task:
1. Review the existing SPEC.QA.md to understand previously identified questions/concerns
2. Check if any previously identified questions have been ANSWERED in the updated spec
3. Identify any NEW ambiguities, underspecified behaviors, or open questions in the spec
4. Note contradictions or areas where the spec could be clearer
5. Consider edge cases the spec doesn't address

Format your response as a structured markdown document with:
- A header "# SPEC.QA.md — Open Questions and Concerns"
- A "## Resolved" section listing questions from previous analysis that are now answered (with brief explanation)
- Sections for "Ambiguities", "Underspecified Behaviors", "Edge Cases", and "Suggested Clarifications"
- Each item should have a unique ID (QA-1, QA-2, etc.) and status (open/resolved)

Preserve QA IDs from the previous analysis when the question still exists.
Be constructive - focus on making the spec better, not criticizing it.
Do NOT invent problems that don't exist. Be precise and factual.`

export interface AnalyzeOptions {
  packageDir: string
  packageName: string
  implPatterns?: Array<string>
}

/** Analyze a single spec rule directory (e.g. `.ok/rules/impl/`) */
const analyzeRule = (
  options: AnalyzeOptions,
  ruleSpecPath: string, // relative to packageDir, e.g. ".ok/rules/impl/SPEC.md"
  openrouter: OpenRouter,
  impl: string
) =>
  Effect.gen(function*() {
    const { packageDir, packageName } = options
    const ruleDir = path.dirname(ruleSpecPath) // e.g. ".ok/rules/impl"
    const ruleName = path.basename(ruleDir) // e.g. "impl"

    const [spec, existingGaps, existingQA] = yield* Effect.all([
      readFile(packageDir, ruleSpecPath),
      readFile(packageDir, path.join(ruleDir, "GAPS.md")),
      readFile(packageDir, path.join(ruleDir, "SPEC.QA.md"))
    ])

    if (!spec) {
      yield* Console.log(`${packageName}/${ruleName}: No SPEC.md found, skipping`)
      return [] as Array<string>
    }

    // Run both analyses in parallel
    const [gapsResponse, qaResponse] = yield* Effect.all([
      openrouter.chat({
        model: "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: GAPS_PROMPT },
          {
            role: "user",
            content: `# Specification
${spec}

# Implementation
${impl}

# Existing Gap Analysis
${existingGaps || "[No existing GAPS.md]"}

Review the existing gap analysis against the current implementation. Generate an updated GAPS.md.`
          }
        ]
      }),
      openrouter.chat({
        model: "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: SPEC_QA_PROMPT },
          {
            role: "user",
            content: `# Specification
${spec}

# Existing QA Document
${existingQA || "[No existing SPEC.QA.md]"}

# Current Implementation (for context)
${impl}

Review the specification and existing QA document. Generate an updated SPEC.QA.md tracking open questions and concerns about the spec itself.`
          }
        ]
      })
    ], { concurrency: 2 })

    const gaps = gapsResponse.choices[0]?.message?.content ?? ""
    const qa = qaResponse.choices[0]?.message?.content ?? ""

    const filesToCommit: Array<string> = []

    if (gaps.length >= 100) {
      const gapsPath = path.join(ruleDir, "GAPS.md")
      yield* writeFile(packageDir, gapsPath, gaps)
      filesToCommit.push(gapsPath)
      yield* Console.log(`${packageName}/${ruleName}: Updated ${gapsPath}`)
    } else {
      yield* Console.error(`${packageName}/${ruleName}: GAPS.md response too short, skipping`)
    }

    if (qa.length >= 100) {
      const qaPath = path.join(ruleDir, "SPEC.QA.md")
      yield* writeFile(packageDir, qaPath, qa)
      filesToCommit.push(qaPath)
      yield* Console.log(`${packageName}/${ruleName}: Updated ${qaPath}`)
    } else {
      yield* Console.error(`${packageName}/${ruleName}: SPEC.QA.md response too short, skipping`)
    }

    return filesToCommit
  })

export const analyze = (options: AnalyzeOptions) =>
  Effect.gen(function*() {
    const { implPatterns = ["src/**/*.ts"], packageDir, packageName } = options

    // Check if this is an auto-commit (prevent infinite loop)
    const lastCommit = yield* getLastCommitMessage(packageDir)
    if (lastCommit.startsWith(AUTO_COMMIT_MARKER)) {
      yield* Console.log(`${packageName}: Skipping auto-commit analysis`)
      return
    }

    yield* Console.log(`${packageName}: Analyzing spec, implementation, and QA...`)

    // Find all rule specs under .ok/rules/*/SPEC.md
    const ruleSpecPaths = yield* findRuleSpecs(packageDir)

    if (ruleSpecPaths.length === 0) {
      yield* Console.log(`${packageName}: No rule specs found under .ok/rules/, skipping`)
      return
    }

    const [impl, openrouter] = yield* Effect.all([
      readImplementationFiles(packageDir, implPatterns),
      OpenRouter
    ])

    // Analyze each rule spec, collecting files to commit
    const allFilesToCommit: Array<string> = []
    for (const ruleSpecPath of ruleSpecPaths) {
      const committed = yield* analyzeRule(options, ruleSpecPath, openrouter, impl)
      allFilesToCommit.push(...committed)
    }

    // Auto-commit all updated files across all rules
    if (allFilesToCommit.length > 0) {
      const committed = yield* autoCommit(packageDir, allFilesToCommit, `Update ${allFilesToCommit.join(" and ")}`)
      if (committed) {
        yield* Console.log(`${packageName}: Auto-committed ${allFilesToCommit.join(", ")}`)
      } else {
        yield* Console.log(`${packageName}: No changes to commit`)
      }
    }
  })

/** Run analysis with OpenRouter.Default provider */
export const runAnalysis = (options: AnalyzeOptions) =>
  analyze(options).pipe(
    Effect.catchAll((e) => Console.error(`${options.packageName} hook error: ${e}`)),
    Effect.provide(OpenRouter.Default)
  )
