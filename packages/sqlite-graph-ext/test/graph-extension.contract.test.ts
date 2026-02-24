import { describe, expect, it } from "@effect-native/bun-test"
import { Database } from "bun:sqlite"
import { readFileSync } from "node:fs"
import { pathToGraphExt } from "../src/index.js"

const pathToLibSqlite = (() => {
  const platform = process.platform === "darwin" && process.arch === "arm64"
    ? "darwin-aarch64"
    : process.platform === "darwin" && process.arch === "x64"
    ? "darwin-x86_64"
    : process.platform === "linux" && process.arch === "x64"
    ? "linux-x86_64"
    : process.platform === "linux" && process.arch === "arm64"
    ? "linux-aarch64"
    : null

  if (platform == null) {
    throw new Error(`Unsupported test platform: ${process.platform}-${process.arch}`)
  }

  return new URL(
    `../../libsqlite/lib/${platform}/libsqlite3.${platform.startsWith("darwin") ? "dylib" : "so"}`,
    import.meta.url
  )
    .pathname
})()

const source = readFileSync(new URL("../src/extension.zig", import.meta.url), "utf8")

Database.setCustomSQLite(pathToLibSqlite)

const functionBlock = (name: string): string => {
  const start = source.indexOf(`export fn ${name}(`)
  if (start < 0) {
    throw new Error(`missing function definition: ${name}`)
  }

  const next = source.indexOf("\nexport fn ", start + 1)
  return source.slice(start, next < 0 ? source.length : next)
}

const expectTextResult = (name: string) => {
  const block = functionBlock(name)
  expect(block).toContain("contextResultText(context")
  expect(block).not.toContain("sqlite3_result_blob(context")
}

const decodeValue = (value: unknown): string => {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  return String(value)
}

const parseRows = (value: unknown): ReadonlyArray<ReadonlyArray<string>> => {
  const text = decodeValue(value)
  if (text.length === 0) return []
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"))
}

const withGraphDb = <R>(run: (db: Database) => R) => {
  const db = new Database(":memory:")
  const extensionPath = pathToGraphExt.replace(/\.(?:so|dylib|dll)$/i, "")
  db.loadExtension(extensionPath, "sqlite3_graph_ext_init")
  try {
    return run(db)
  } finally {
    db.close()
  }
}

describe("graph extension table-shaped contracts are text encoded", () => {
  it("emits text from idset_each", () => {
    expectTextResult("idset_each")
  })

  it("emits text from graph_out_many", () => {
    expectTextResult("graph_out_many")
  })

  it("emits text from graph_in_many", () => {
    expectTextResult("graph_in_many")
  })

  it("emits text from graph_out_idset", () => {
    expectTextResult("graph_out_idset")
  })

  it("emits text from graph_in_idset", () => {
    expectTextResult("graph_in_idset")
  })

  it("returns deterministic ordinals from idset_each", () => {
    const block = functionBlock("idset_each")
    expect(block).toContain("for (set.items, 0..) |id, ord|")
    expect(block).toContain("const ordText = std.fmt.allocPrint(allocator, \"{d}\", .{ord + 1})")
  })

  it("preserves stable source/destination ordering for traversal outputs", () => {
    const outManyBlock = functionBlock("graph_out_many")
    const inManyBlock = functionBlock("graph_in_many")

    expect(outManyBlock).toContain("ORDER BY src, dst")
    expect(inManyBlock).toContain("ORDER BY dst, src")
    expect(outManyBlock).toContain("src, dst")
    expect(inManyBlock).toContain("dst, src")
  })

  it("returns empty-string payload when graph source set is empty", () => {
    const block = functionBlock("graph_out_many")
    expect(block).toContain("if (set.items.len == 0) {")
    expect(block).toContain("contextResultText(context, \"\")")
  })

  it("emits deterministic row order for graph_out_many payload", () => {
    const rows = withGraphDb((db) => {
      db.exec("CREATE TABLE edge_table(src TEXT, dst TEXT, edge_type TEXT)")
      db.exec(
        "INSERT INTO edge_table(src, dst, edge_type) VALUES ('zeta', 'node-c', 'follows'), ('alpha', 'node-b', 'follows'), ('alpha', 'node-a', 'follows'), ('beta', 'node-a', 'other')"
      )

      return parseRows(
        db
          .query(
            "SELECT graph_out_many('edge_table', 'follows', idset_add(idset_add(idset_empty(), 'zeta'), 'alpha'), '') AS payload"
          )
          .get()?.payload
      )
    })

    expect(rows).toEqual([
      ["alpha", "node-a"],
      ["alpha", "node-b"],
      ["zeta", "node-c"]
    ])
  })

  it("emits deterministic idset_each ordinals and rows", () => {
    const rows = withGraphDb((db) => {
      return parseRows(
        db
          .query("SELECT idset_each(idset_add(idset_add(idset_add(idset_empty(), 'z'), 'a'), 'm')) AS payload")
          .get()?.payload
      )
    })
    expect(rows).toEqual([
      ["a", "1"],
      ["m", "2"],
      ["z", "3"]
    ])
  })

  it("returns compact text payloads for ranked diff and two-hop counts", () => {
    const twoHopRows = withGraphDb((db) => {
      db.exec("CREATE TABLE edges(src TEXT, dst TEXT, edge_type TEXT)")
      db.exec(
        "INSERT INTO edges(src, dst, edge_type) VALUES ('a', 'x', 'hop1'), ('b', 'x', 'hop1'), ('x', 'y', 'hop2'), ('x', 'z', 'hop2')"
      )

      return parseRows(
        db
          .query(
            "SELECT graph_two_hop_counts('edges', 'hop1', 'hop2', idset_add(idset_add(idset_empty(), 'a'), 'b')) AS payload"
          )
          .get()?.payload
      )
    })

    expect(twoHopRows).toEqual([
      ["y", "2"],
      ["z", "2"]
    ])

    const rankedRows = withGraphDb((db) => {
      db.exec("CREATE TABLE serp_snapshots(serp_id TEXT, rank INTEGER, url_or_entity_id TEXT)")
      db.exec(
        "INSERT INTO serp_snapshots VALUES ('old', 1, 'a'), ('old', 2, 'b'), ('new', 1, 'b'), ('new', 3, 'c')"
      )

      return parseRows(db.query("SELECT ranked_diff('old', 'new', 'serp_snapshots') AS payload").get()?.payload)
    })

    expect(rankedRows.length).toBeGreaterThan(0)
    expect(rankedRows[0]![0]).toBe("a")
  })
})
