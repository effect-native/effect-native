/**
 * Stress tests for GhosttyHarness using real lazygit TUI.
 *
 * These tests spawn the actual lazygit process with PTY support and
 * feed its output through the Ghostty WASM terminal emulator to verify
 * that complex TUI applications render correctly without garbage characters.
 *
 * Tests are skipped if lazygit is not installed.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, test } from "@effect-native/bun-test"
import { execSync } from "child_process"
import * as Effect from "effect/Effect"
import { GhosttyHarness } from "../src/GhosttyHarness.js"
import { sendKey, spawnTui, waitForStable } from "../src/Spawn.js"

// Check if lazygit is installed
let lazygitPath: string | null = null
let lazygitVersion: string | null = null

try {
  lazygitPath = execSync("which lazygit", { encoding: "utf-8" }).trim()
  lazygitVersion = execSync("lazygit --version", { encoding: "utf-8" }).trim()
} catch {
  // lazygit not installed
}

const isLazygitInstalled = lazygitPath !== null

// Create a temporary git repo for testing
let tempDir: string | null = null
let lazygitConfigFile: string | null = null

function setupTempGitRepo(): string {
  const dir = execSync("mktemp -d", { encoding: "utf-8" }).trim()
  execSync("git init", { cwd: dir })
  execSync("git config user.email 'test@test.com'", { cwd: dir })
  execSync("git config user.name 'Test User'", { cwd: dir })
  // Create some files and commits for lazygit to show
  execSync("echo 'hello' > file1.txt", { cwd: dir })
  execSync("git add file1.txt", { cwd: dir })
  execSync("git commit -m 'Initial commit'", { cwd: dir })
  execSync("echo 'world' > file2.txt", { cwd: dir })
  execSync("echo 'modified' >> file1.txt", { cwd: dir })
  return dir
}

function setupLazygitConfig(): string {
  const configFile = execSync("mktemp", { encoding: "utf-8" }).trim()
  // Disable random tips for stable snapshots
  execSync(
    `cat > "${configFile}" << 'EOF'
gui:
  showRandomTip: false
EOF`,
    { encoding: "utf-8" }
  )
  return configFile
}

function cleanupTempDir(dir: string): void {
  try {
    execSync(`rm -rf "${dir}"`)
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Normalize screenshot output for stable snapshots.
 * Replaces dynamic values that change between test runs:
 * - Temp directory names (tmp.XXXXXXXXXX)
 * - Git commit hashes (various formats)
 * - Git index hashes in diff output
 * - Random tips in command log
 * - Timing variations
 */
function normalizeSnapshot(screenshot: string): string {
  return (
    "\n" +
    screenshot
      // Replace tmp.XXXXXXXXXX directory names with stable placeholder
      .replace(/tmp\.[A-Za-z0-9]{10,}/g, "tmp.XXXXXXXXXX")
      // Replace 8-char commit hash prefixes in commit list (like "│043b5aeb " or "28cf2f60TU")
      .replace(/│([0-9a-f]{8}) /g, "│XXXXXXXX ")
      .replace(/^([0-9a-f]{8})TU/gm, "XXXXXXXXTU")
      // Replace "commit <hash>" format in log view (like "commit 2d75161")
      .replace(/commit [0-9a-f]{7,}/g, "commit XXXXXXX")
      // Replace index lines in git diff with spaces (index ce01362..3edf2d5 100644)
      .replace(/index [0-9a-f]{7}\.\.[0-9a-f]{7}/g, "index XXXXXXX..XXXXXXX")
      // Replace index lines without spaces (indexce01362..3edf2d5100644)
      .replace(/index[0-9a-f]{7}\.\.[0-9a-f]{7}/g, "indexXXXXXXX..XXXXXXX")
      // Replace timing variations ("0 seconds ago", "1 second ago", etc.)
      .replace(/\d+ seconds? ago/g, "N seconds ago")
      // Replace random tip lines (they vary between runs)
      .replace(/Random tip:.*$/gm, "Random tip: [tip content varies]")
      // Replace Randomtip lines without space (compressed output)
      .replace(/Randomtip:.*$/gm, "Randomtip: [tip content varies]")
  )
}

describe.skipIf(!isLazygitInstalled)("lazygit real TUI stress tests", () => {
  let harness: GhosttyHarness

  beforeAll(async () => {
    harness = await GhosttyHarness.createAsync()
    tempDir = setupTempGitRepo()
    lazygitConfigFile = setupLazygitConfig()
    console.log(`lazygit found at: ${lazygitPath}`)
    console.log(`lazygit version: ${lazygitVersion}`)
    console.log(`Test repo at: ${tempDir}`)
  })

  afterAll(() => {
    if (tempDir) {
      cleanupTempDir(tempDir)
    }
    if (lazygitConfigFile) {
      cleanupTempDir(lazygitConfigFile)
    }
  })

  afterEach(() => {
    harness.cleanup()
  })

  it.scoped("renders initial lazygit UI without garbage", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["lazygit"], {
        cols: 100,
        rows: 30,
        cwd: tempDir!,
        env: {
          TERM: "xterm-256color",
          // Disable mouse to simplify output
          LG_CONFIG_FILE: lazygitConfigFile!
        }
      })

      // Wait for lazygit to render its UI
      yield* waitForStable(handle, 100, 2000)

      // Get raw output and feed it through Ghostty
      const rawOutput = handle.getOutput()

      // Create terminal and render
      const term = harness.createTerminal(100, 30)
      yield* harness.write(term, rawOutput)

      const screenshot = harness.screenshot(term)

      // Close lazygit
      yield* sendKey(handle, "q")
      yield* handle.exited

      // Snapshot the full screenshot
      expect(normalizeSnapshot(screenshot)).toMatchSnapshot()
    }))

  it.scoped("handles navigation and panel switching", () =>
    Effect.gen(function*() {
      const screenshots: Array<string> = []

      const handle = yield* spawnTui(["lazygit"], {
        cols: 120,
        rows: 40,
        cwd: tempDir!,
        env: {
          TERM: "xterm-256color",
          LG_CONFIG_FILE: lazygitConfigFile!
        }
      })

      // Create a single terminal instance to reuse
      const term = harness.createTerminal(120, 40)

      // Wait for initial render
      yield* waitForStable(handle, 100, 2000)

      // Capture initial state
      yield* harness.write(term, handle.getOutput())
      screenshots.push(harness.screenshot(term))

      // Navigate down in the files list
      yield* sendKey(handle, "\x1b[B") // Arrow down
      yield* waitForStable(handle, 50, 1000)

      yield* harness.write(term, handle.getOutput())
      screenshots.push(harness.screenshot(term))

      // Switch to branches panel (typically '2' or right arrow)
      yield* sendKey(handle, "\x1b[C") // Arrow right
      yield* waitForStable(handle, 50, 1000)

      yield* harness.write(term, handle.getOutput())
      screenshots.push(harness.screenshot(term))

      // Quit
      yield* sendKey(handle, "q")
      yield* handle.exited

      // Each screenshot should have some content
      for (const screenshot of screenshots) {
        expect(screenshot.length).toBeGreaterThan(10)
      }

      expect(
        normalizeSnapshot(screenshots[0]!),
        "the initial state"
      ).toMatchSnapshot("the initial state")
      expect(
        normalizeSnapshot(screenshots[1]!),
        "after navigation"
      ).toMatchSnapshot("after navigation")
      expect(
        normalizeSnapshot(screenshots[2]!),
        "after panel switch"
      ).toMatchSnapshot("after panel switch")
    }))

  it.scoped("handles rapid UI updates (scrolling)", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["lazygit"], {
        cols: 80,
        rows: 24,
        cwd: tempDir!,
        env: {
          TERM: "xterm-256color",
          LG_CONFIG_FILE: lazygitConfigFile!
        }
      })

      // Wait for initial render
      yield* waitForStable(handle, 100, 2000)

      // Rapidly scroll up/down (no delays between keys - test rapid input)
      for (let i = 0; i < 5; i++) {
        yield* sendKey(handle, "\x1b[B") // down
      }
      for (let i = 0; i < 5; i++) {
        yield* sendKey(handle, "\x1b[A") // up
      }

      yield* waitForStable(handle, 50, 1000)

      // Capture final state
      const term = harness.createTerminal(80, 24)
      yield* harness.write(term, handle.getOutput())
      const screenshot = harness.screenshot(term)

      yield* sendKey(handle, "q")
      yield* handle.exited

      // Snapshot the scrolling result
      expect(normalizeSnapshot(screenshot)).toMatchSnapshot()
    }))

  it.scoped("captures colors and attributes from lazygit", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["lazygit"], {
        cols: 100,
        rows: 30,
        cwd: tempDir!,
        env: {
          TERM: "xterm-256color",
          LG_CONFIG_FILE: lazygitConfigFile!
        }
      })

      yield* waitForStable(handle, 100, 2000)

      const term = harness.createTerminal(100, 30)
      yield* harness.write(term, handle.getOutput())

      // Scan for cells with non-default colors
      let hasColors = false
      let hasBold = false
      let hasInverse = false

      for (let row = 0; row < 30; row++) {
        for (let col = 0; col < 100; col++) {
          const cell = harness.getCell(term, row, col)
          if (cell) {
            // Check for non-default foreground color (default is usually 0)
            if (cell.fgColor !== 0 && cell.fgColorMode !== 0) {
              hasColors = true
            }
            if (cell.isBold) hasBold = true
            if (cell.isInverse) hasInverse = true
          }
        }
      }

      const screenshot = harness.screenshot(term)

      yield* sendKey(handle, "q")
      yield* handle.exited

      // lazygit uses colors extensively for:
      // - Status indicators (modified, staged, etc.)
      // - Selection highlighting (inverse)
      // - Panel headers (often bold)
      expect(hasColors || hasBold || hasInverse).toBe(true)

      // Snapshot the color-rich output
      expect(normalizeSnapshot(screenshot)).toMatchSnapshot()
    }))

  it.scoped("handles box drawing characters from lazygit panels", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["lazygit"], {
        cols: 100,
        rows: 30,
        cwd: tempDir!,
        env: {
          TERM: "xterm-256color",
          LG_CONFIG_FILE: lazygitConfigFile!
        }
      })

      yield* waitForStable(handle, 100, 2000)

      const term = harness.createTerminal(100, 30)
      yield* harness.write(term, handle.getOutput())
      const screenshot = harness.screenshot(term)

      yield* sendKey(handle, "q")
      yield* handle.exited

      // lazygit uses box drawing for panel borders
      // Check that box drawing characters appear (U+2500-U+257F range)
      // OR ASCII box drawing (+, -, |)
      const hasBoxDrawing = /[\u2500-\u257F]/.test(screenshot) || // Unicode box drawing
        /[+\-|]/.test(screenshot) // ASCII box drawing

      expect(hasBoxDrawing).toBe(true)

      // Snapshot the box drawing output
      expect(normalizeSnapshot(screenshot)).toMatchSnapshot()
    }))

  it.scoped("renders help menu without garbage", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["lazygit"], {
        cols: 100,
        rows: 40,
        cwd: tempDir!,
        env: {
          TERM: "xterm-256color",
          LG_CONFIG_FILE: lazygitConfigFile!
        }
      })

      // Wait for initial render
      yield* waitForStable(handle, 100, 2000)

      // Open help menu
      yield* sendKey(handle, "?")
      yield* waitForStable(handle, 100, 1000)

      const term = harness.createTerminal(100, 40)
      yield* harness.write(term, handle.getOutput())
      const screenshot = harness.screenshot(term)

      // Close help and quit
      yield* sendKey(handle, "\x1b") // Escape
      yield* waitForStable(handle, 50, 500)
      yield* sendKey(handle, "q")
      yield* handle.exited

      // Help menu should mention keybindings or have descriptive text
      // (content varies by version)
      expect(screenshot.length).toBeGreaterThan(50)

      // Snapshot the help menu output
      expect(normalizeSnapshot(screenshot)).toMatchSnapshot()
    }))

  it.scoped("terminal resize preserves content integrity", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["lazygit"], {
        cols: 80,
        rows: 24,
        cwd: tempDir!,
        env: {
          TERM: "xterm-256color",
          LG_CONFIG_FILE: lazygitConfigFile!
        }
      })

      yield* waitForStable(handle, 100, 2000)

      // Capture before resize
      const term1 = harness.createTerminal(80, 24)
      yield* harness.write(term1, handle.getOutput())
      const before = harness.screenshot(term1)

      // Resize terminal
      handle.resize(120, 40)
      handle.clearOutput()
      yield* waitForStable(handle, 100, 1000)

      // Capture after resize
      const term2 = harness.createTerminal(120, 40)
      yield* harness.write(term2, handle.getOutput())
      const after = harness.screenshot(term2)

      yield* sendKey(handle, "q")
      yield* handle.exited

      // After resize should have content
      expect(after.length).toBeGreaterThan(10)
      expect(normalizeSnapshot(before)).toMatchSnapshot()
      expect(normalizeSnapshot(after)).toMatchSnapshot()
    }))
})

// Info test that always runs
describe("lazygit availability", () => {
  test("reports lazygit installation status", () => {
    if (isLazygitInstalled) {
      console.log(`✓ lazygit is installed at: ${lazygitPath}`)
      console.log(`  Version: ${lazygitVersion}`)
    } else {
      console.log("⚠ lazygit is not installed - stress tests will be skipped")
      console.log("  Install with: brew install lazygit")
      console.log("  Or: nix-env -iA nixpkgs.lazygit")
    }
    expect(true).toBe(true) // Always pass
  })
})
