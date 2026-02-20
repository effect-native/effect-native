#!/usr/bin/env bun
/**
 * `bun ok` - Instant status display for gaps and QA items
 * No LLM calls - just reads YAML frontmatter from local files
 */
import { glob } from "glob"
import * as fs from "node:fs"
import * as path from "node:path"

// Colors
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`

interface GapFrontmatter {
  id: string
  title: string
  status: "open" | "resolved"
  severity: "critical" | "high" | "medium" | "low"
  category: "security" | "correctness" | "ux" | "informational"
  spec_section?: string
  impl_location?: string
  created?: string
  resolved_at?: string | null
  resolved_in?: string | null
  resolved_reason?: string | null
}

interface QAFrontmatter {
  id: string
  title: string
  status: "open" | "resolved"
  category: "ambiguity" | "underspecified" | "edge-case" | "contradiction"
  spec_section?: string
  created?: string
  resolved_at?: string | null
  resolved_reason?: string | null
}

function parseFrontmatter<T>(content: string): T | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  try {
    return Bun.YAML.parse(match[1]) as T
  } catch {
    return null
  }
}

function readItems<T>(dir: string, pattern: string): Array<T> {
  const items: Array<T> = []
  const files = glob.sync(pattern, { cwd: dir })
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), "utf-8")
      const frontmatter = parseFrontmatter<T>(content)
      if (frontmatter) items.push(frontmatter)
    } catch {
      // Skip unreadable files
    }
  }
  return items
}

function severityColor(severity: string): (s: string) => string {
  switch (severity) {
    case "critical":
      return red
    case "high":
      return yellow
    case "medium":
      return (s) => s
    case "low":
      return dim
    default:
      return (s) => s
  }
}

function statusIcon(status: string): string {
  return status === "resolved" ? green("✓") : red("✗")
}

export function runOk(packageDir: string = process.cwd()) {
  const gaps = readItems<GapFrontmatter>(packageDir, ".ok/rules/**/*.gap.md")
  const qas = readItems<QAFrontmatter>(packageDir, ".ok/rules/**/SPEC.QA.md")

  const openGaps = gaps.filter((g) => g.status === "open")
  const resolvedGaps = gaps.filter((g) => g.status === "resolved")
  const openQAs = qas.filter((q) => q.status === "open")
  const resolvedQAs = qas.filter((q) => q.status === "resolved")

  const criticalGaps = openGaps.filter((g) => g.severity === "critical")
  const highGaps = openGaps.filter((g) => g.severity === "high")

  // Header
  console.log()
  if (criticalGaps.length > 0) {
    console.log(red(bold("✗ NOT OK")) + " - Critical issues found")
  } else if (highGaps.length > 0) {
    console.log(yellow(bold("⚠ NEEDS ATTENTION")) + " - High priority issues")
  } else if (openGaps.length > 0 || openQAs.length > 0) {
    console.log(yellow(bold("○ IN PROGRESS")) + " - Some open items")
  } else if (gaps.length === 0 && qas.length === 0) {
    console.log(dim("○ NO DATA") + " - Run post-commit hook to analyze")
  } else {
    console.log(green(bold("✓ OK")) + " - All items resolved")
  }
  console.log()

  // Gaps summary
  if (gaps.length > 0) {
    console.log(bold("Gaps:") + ` ${openGaps.length} open, ${resolvedGaps.length} resolved`)

    // Show open gaps by severity
    for (const severity of ["critical", "high", "medium", "low"] as const) {
      const items = openGaps.filter((g) => g.severity === severity)
      if (items.length > 0) {
        const color = severityColor(severity)
        for (const gap of items) {
          console.log(`  ${statusIcon(gap.status)} ${color(`[${severity.toUpperCase()}]`)} ${gap.id}: ${gap.title}`)
        }
      }
    }
    console.log()
  }

  // QA summary
  if (qas.length > 0) {
    console.log(bold("QA:") + ` ${openQAs.length} open, ${resolvedQAs.length} resolved`)

    for (const qa of openQAs) {
      console.log(`  ${statusIcon(qa.status)} ${qa.id}: ${qa.title}`)
    }
    console.log()
  }

  // Exit code based on severity
  if (criticalGaps.length > 0) {
    process.exit(1)
  } else if (highGaps.length > 0) {
    process.exit(2)
  }
  process.exit(0)
}

// Run if called directly
if (import.meta.main) {
  runOk()
}
