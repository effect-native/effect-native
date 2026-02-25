import { NodeContext } from "@effect/platform-node"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import { describe, expect, it } from "vitest"
import { cli, CliLayer } from "../src/cli.js"

// Simple mock console that captures log output
const makeMockConsole = Effect.gen(function*() {
  const lines = yield* Ref.make<Array<string>>([])

  const mockConsole: Console.Console = {
    [Console.TypeId]: Console.TypeId,
    log: (...args) => Ref.update(lines, (arr) => [...arr, ...args.map(String)]),
    unsafe: globalThis.console,
    assert: () => Effect.void,
    clear: Effect.void,
    count: () => Effect.void,
    countReset: () => Effect.void,
    debug: () => Effect.void,
    dir: () => Effect.void,
    dirxml: () => Effect.void,
    error: () => Effect.void,
    group: () => Effect.void,
    groupEnd: Effect.void,
    info: () => Effect.void,
    table: () => Effect.void,
    time: () => Effect.void,
    timeEnd: () => Effect.void,
    timeLog: () => Effect.void,
    trace: () => Effect.void,
    warn: () => Effect.void
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
      Console.setConsole(mockConsole),
      NodeContext.layer
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

    expect(output).toMatch(/effect-native \d+\.\d+\.\d+/)
    expect(output).toContain("USAGE")
    expect(output).toContain("tight feedback loops")
    expect(output).toContain("Slice time very thinly")
  })
})
