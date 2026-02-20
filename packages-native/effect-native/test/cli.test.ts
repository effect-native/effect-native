import { NodeServices } from "@effect/platform-node"
import { describe, expect, it } from "bun:test"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import { cli, CliLayer } from "../src/cli.js"

// Simple mock console that captures log output
// In Effect v4, Console is a plain synchronous interface (not Effect-based)
const makeMockConsole = Effect.gen(function*() {
  const lines = yield* Ref.make<Array<string>>([])

  const mockConsole: Console.Console = {
    assert: () => {},
    clear: () => {},
    count: () => {},
    countReset: () => {},
    debug: () => {},
    dir: () => {},
    dirxml: () => {},
    error: () => {},
    group: () => {},
    groupCollapsed: () => {},
    groupEnd: () => {},
    info: () => {},
    log: (...args) => {
      Effect.runFork(Ref.update(lines, (arr) => [...arr, ...args.map(String)]))
    },
    table: () => {},
    time: () => {},
    timeEnd: () => {},
    timeLog: () => {},
    trace: () => {},
    warn: () => {}
  }

  return { mockConsole, getLines: () => Ref.get(lines) }
})

const stripAnsi = (str: string) =>
  str.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?[\u0007])|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g,
    ""
  )

const runCliWithMockConsole = (args: ReadonlyArray<string>) =>
  Effect.gen(function*() {
    const { getLines, mockConsole } = yield* makeMockConsole
    const TestLayer = Layer.mergeAll(
      CliLayer,
      Layer.succeed(Console.Console)(mockConsole),
      NodeServices.layer
    )

    yield* Effect.provide(cli(args), TestLayer)
    const rawLines = yield* getLines()
    return rawLines.map(stripAnsi)
  }).pipe(Effect.runPromise)

describe("effect-native cli", () => {
  it("renders helpful guidance when invoked with --help", async () => {
    const lines = await runCliWithMockConsole([
      "node",
      "effect-native",
      "--help"
    ])

    const output = lines.join("\n")

    expect(output).toContain("effect-native 0.1.0")
    expect(output).toContain("USAGE")
    expect(output).toContain("tight feedback loops")
    expect(output).toContain("Slice time very thinly")
  })
})
