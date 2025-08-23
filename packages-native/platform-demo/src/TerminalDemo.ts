/**
 * @since 0.0.1
 */
import * as Terminal from "@effect/platform/Terminal"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import { logDemo, logResult, logSection } from "./utils/DemoHelpers.js"

/**
 * @since 0.0.1
 * @category demos
 * @example
 * ```ts
 * import * as TerminalDemo from "@effect-native/platform-demo/TerminalDemo"
 * import * as NodeTerminal from "@effect/platform-node/NodeTerminal"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 *
 * Effect.provide(
 *   TerminalDemo.basicInput,
 *   NodeTerminal.layer
 * ).pipe(Effect.runPromise)
 * ```
 */
export const basicInput = Effect.gen(function*() {
  yield* logSection("Terminal Basic Input")

  const terminal = yield* Terminal.Terminal

  yield* logDemo("Read Line", "Getting user input")
  yield* terminal.display("Please enter your name: ")
  const name = yield* terminal.readLine
  yield* logResult("You entered", name)

  yield* logDemo("Confirm", "Yes/No prompt")
  yield* terminal.display("Do you want to continue? (y/n): ")
  const response = yield* terminal.readLine
  const confirmed = response.toLowerCase() === "y"
  yield* logResult("Confirmed", confirmed)

  return { name, confirmed }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const coloredOutput = Effect.gen(function*() {
  yield* logSection("Colored Terminal Output")

  const terminal = yield* Terminal.Terminal

  yield* logDemo("Basic Colors", "Displaying colored text")
  yield* terminal.display("Normal text\n")
  yield* terminal.display("\x1b[31mRed text\x1b[0m\n")
  yield* terminal.display("\x1b[32mGreen text\x1b[0m\n")
  yield* terminal.display("\x1b[33mYellow text\x1b[0m\n")
  yield* terminal.display("\x1b[34mBlue text\x1b[0m\n")
  yield* terminal.display("\x1b[35mMagenta text\x1b[0m\n")
  yield* terminal.display("\x1b[36mCyan text\x1b[0m\n")

  yield* logDemo("Text Styles", "Bold, underline, etc.")
  yield* terminal.display("\x1b[1mBold text\x1b[0m\n")
  yield* terminal.display("\x1b[4mUnderlined text\x1b[0m\n")
  yield* terminal.display("\x1b[7mInverted text\x1b[0m\n")

  yield* logDemo("Combined Styles", "Multiple attributes")
  yield* terminal.display("\x1b[1;31mBold Red\x1b[0m\n")
  yield* terminal.display("\x1b[4;32mUnderlined Green\x1b[0m\n")
  yield* terminal.display("\x1b[1;4;34mBold Underlined Blue\x1b[0m\n")

  return { colors: "displayed" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const interactiveMenu = Effect.gen(function*() {
  yield* logSection("Interactive Menu")

  const terminal = yield* Terminal.Terminal

  yield* logDemo("Menu Selection", "Choose an option")
  yield* terminal.display("\n=== Main Menu ===\n")
  yield* terminal.display("1. View Profile\n")
  yield* terminal.display("2. Edit Settings\n")
  yield* terminal.display("3. Check Messages\n")
  yield* terminal.display("4. Exit\n")
  yield* terminal.display("\nEnter your choice (1-4): ")

  const choice = yield* terminal.readLine

  const action = (() => {
    switch (choice) {
      case "1":
        return "Viewing profile..."
      case "2":
        return "Opening settings..."
      case "3":
        return "Checking messages..."
      case "4":
        return "Exiting..."
      default:
        return "Invalid choice"
    }
  })()

  yield* logResult("Action", action)

  return { choice, action }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const progressIndicator = Effect.gen(function*() {
  yield* logSection("Progress Indicators")

  const terminal = yield* Terminal.Terminal

  yield* logDemo("Progress Bar", "Simulating progress")
  const total = 20

  for (let i = 0; i <= total; i++) {
    const percentage = Math.floor((i / total) * 100)
    const filled = Math.floor((i / total) * 20)
    const bar = "█".repeat(filled) + "░".repeat(20 - filled)

    yield* terminal.display(`\r[${bar}] ${percentage}%`)
    yield* Effect.sleep("50 millis")
  }

  yield* terminal.display("\n")
  yield* logResult("Progress", "Complete!")

  yield* logDemo("Spinner", "Loading animation")
  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

  for (let i = 0; i < 20; i++) {
    yield* terminal.display(`\r${spinnerChars[i % spinnerChars.length]} Loading...`)
    yield* Effect.sleep("100 millis")
  }

  yield* terminal.display("\r✓ Loaded!     \n")

  return { progress: "shown" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const formInput = Effect.gen(function*() {
  yield* logSection("Form Input")

  const terminal = yield* Terminal.Terminal

  yield* logDemo("User Registration", "Collecting form data")

  yield* terminal.display("=== Registration Form ===\n\n")

  yield* terminal.display("Username: ")
  const username = yield* terminal.readLine

  yield* terminal.display("Email: ")
  const email = yield* terminal.readLine

  yield* terminal.display("Age: ")
  const age = yield* terminal.readLine

  yield* terminal.display("Country: ")
  const country = yield* terminal.readLine

  yield* terminal.display("\n=== Summary ===\n")
  yield* terminal.display(`Username: ${username}\n`)
  yield* terminal.display(`Email: ${email}\n`)
  yield* terminal.display(`Age: ${age}\n`)
  yield* terminal.display(`Country: ${country}\n`)

  yield* terminal.display("\nConfirm registration? (y/n): ")
  const confirm = yield* terminal.readLine

  yield* logResult("Registration", confirm.toLowerCase() === "y" ? "Confirmed" : "Cancelled")

  return { username, email, age, country, confirmed: confirm.toLowerCase() === "y" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const tableDisplay = Effect.gen(function*() {
  yield* logSection("Table Display")

  const terminal = yield* Terminal.Terminal

  yield* logDemo("Data Table", "Formatted table output")

  const data = [
    { id: 1, name: "Alice", role: "Developer", status: "Active" },
    { id: 2, name: "Bob", role: "Designer", status: "Active" },
    { id: 3, name: "Charlie", role: "Manager", status: "Away" },
    { id: 4, name: "Diana", role: "Developer", status: "Active" }
  ]

  yield* terminal.display("\n")
  yield* terminal.display("┌────┬──────────┬────────────┬────────┐\n")
  yield* terminal.display("│ ID │ Name     │ Role       │ Status │\n")
  yield* terminal.display("├────┼──────────┼────────────┼────────┤\n")

  for (const row of data) {
    const id = row.id.toString().padEnd(2)
    const name = row.name.padEnd(8)
    const role = row.role.padEnd(10)
    const status = row.status.padEnd(6)
    yield* terminal.display(`│ ${id} │ ${name} │ ${role} │ ${status} │\n`)
  }

  yield* terminal.display("└────┴──────────┴────────────┴────────┘\n")

  yield* logResult("Table", "Displayed")

  return { rows: data.length }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const streamingOutput = Effect.gen(function*() {
  yield* logSection("Streaming Output")

  const terminal = yield* Terminal.Terminal

  yield* logDemo("Live Log Stream", "Simulating log output")

  const logs = Stream.range(1, 10).pipe(
    Stream.map((n) => `[${new Date().toISOString()}] Log entry #${n}`),
    Stream.schedule(Schedule.spaced("200 millis"))
  )

  yield* Stream.runForEach(logs, (log) => terminal.display(`${log}\n`))

  yield* logResult("Stream", "Completed")

  return { streamed: true }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const clearAndPosition = Effect.gen(function*() {
  yield* logSection("Terminal Control")

  const terminal = yield* Terminal.Terminal

  yield* logDemo("Clear Screen", "Terminal manipulation")

  yield* terminal.display("This text will be cleared in 2 seconds...")
  yield* Effect.sleep("2 seconds")
  yield* terminal.display("\x1b[2J\x1b[H")

  yield* terminal.display("Screen cleared!\n")

  yield* logDemo("Cursor Movement", "Positioning text")
  yield* terminal.display("\n\n\n\n\n")
  yield* terminal.display("\x1b[5A")
  yield* terminal.display("Text written 5 lines up!\n")
  yield* terminal.display("\x1b[5B")

  yield* logResult("Control", "Demonstrated")

  return { cleared: true }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function*() {
  yield* Console.log("\n⚠️  Terminal demos require interactive input.")
  yield* Console.log("Run individual demos with a Terminal layer for full functionality.")
  yield* Console.log("\nAvailable demos:")
  yield* Console.log("- basicInput: Read user input")
  yield* Console.log("- coloredOutput: Display colored text")
  yield* Console.log("- interactiveMenu: Menu selection")
  yield* Console.log("- progressIndicator: Progress bars and spinners")
  yield* Console.log("- formInput: Collect form data")
  yield* Console.log("- tableDisplay: Formatted tables")
  yield* Console.log("- streamingOutput: Live streaming logs")
  yield* Console.log("- clearAndPosition: Terminal control")

  yield* Console.log("\n✨ Terminal demo descriptions complete!")
})
