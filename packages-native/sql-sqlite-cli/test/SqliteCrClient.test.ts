import * as Reactivity from "@effect/experimental/Reactivity"
import { FileSystem } from "@effect/platform"
import { NodeCommandExecutor, NodeFileSystem, NodePath } from "@effect/platform-node"
import { SqlClient } from "@effect/sql"
import { assert, layer as withLayer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as SqliteCrClient from "../src/SqliteCrClient.js"

/**
 * Test Layer that provides all necessary dependencies
 */
const TestLive = NodeCommandExecutor.layer.pipe(
  Layer.provideMerge(NodeFileSystem.layer),
  Layer.merge(NodePath.layer),
  Layer.merge(Reactivity.layer)
)

/**
 * Create a temporary SQLite database file for testing
 */
const makeTempDb = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const tempDir = yield* fs.makeTempDirectoryScoped()
  const dbPath = `${tempDir}/test.db`
  return dbPath
})

withLayer(TestLive)("SqliteCrClient", (it) => {
  it.scoped("should create a SqlClient that can execute queries", () =>
    Effect.gen(function*() {
      const dbPath = yield* makeTempDb

      // Create the SqliteCrClient
      const clientLayer = SqliteCrClient.layerConfig({
        filename: dbPath
      })

      yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        // Create a table
        yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)`

        // Insert some data
        yield* sql`INSERT INTO users (name, age) VALUES ('Alice', 30)`
        yield* sql`INSERT INTO users (name, age) VALUES ('Bob', 25)`

        // Query the data
        const users = yield* sql`SELECT * FROM users ORDER BY id`

        assert.deepStrictEqual(users, [
          { id: 1, name: "Alice", age: 30 },
          { id: 2, name: "Bob", age: 25 }
        ])
      }).pipe(
        Effect.provide(clientLayer)
      )
    }))

  it.scoped("should handle transactions", () =>
    Effect.gen(function*() {
      const dbPath = yield* makeTempDb

      const clientLayer = SqliteCrClient.layerConfig({
        filename: dbPath
      })

      const result = yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        // Setup
        yield* sql`CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT, balance REAL)`
        yield* sql`INSERT INTO accounts (name, balance) VALUES ('Alice', 100.0)`
        yield* sql`INSERT INTO accounts (name, balance) VALUES ('Bob', 50.0)`

        // Transfer money in a transaction
        yield* sql.withTransaction(Effect.gen(function*() {
          yield* sql`UPDATE accounts SET balance = balance - 25.0 WHERE name = 'Alice'`
          yield* sql`UPDATE accounts SET balance = balance + 25.0 WHERE name = 'Bob'`
        }))

        // Query final balances
        const accounts = yield* sql`SELECT * FROM accounts ORDER BY name`
        return accounts
      }).pipe(
        Effect.provide(clientLayer)
      )

      assert.deepStrictEqual(result, [
        { id: 1, name: "Alice", balance: 75.0 },
        { id: 2, name: "Bob", balance: 75.0 }
      ])
    }))

  it.scoped("should work with complex queries", () =>
    Effect.gen(function*() {
      const dbPath = yield* makeTempDb

      const clientLayer = SqliteCrClient.layerConfig({
        filename: dbPath
      })

      const result = yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        // Setup tables with foreign key relationship
        yield* sql`CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT)`
        yield* sql`CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER)`

        // Insert data
        yield* sql`INSERT INTO categories (name) VALUES ('Electronics')`
        yield* sql`INSERT INTO categories (name) VALUES ('Books')`
        yield* sql`INSERT INTO items (name, category_id) VALUES ('Laptop', 1)`
        yield* sql`INSERT INTO items (name, category_id) VALUES ('Phone', 1)`
        yield* sql`INSERT INTO items (name, category_id) VALUES ('Novel', 2)`

        // Query with JOIN
        const results = yield* sql`
          SELECT i.name as item_name, c.name as category_name
          FROM items i
          JOIN categories c ON i.category_id = c.id
          ORDER BY i.name
        `

        return results
      }).pipe(
        Effect.provide(clientLayer)
      )

      assert.deepStrictEqual(result, [
        { item_name: "Laptop", category_name: "Electronics" },
        { item_name: "Novel", category_name: "Books" },
        { item_name: "Phone", category_name: "Electronics" }
      ])
    }))

  it.scoped("should provide SqlClient interface", () =>
    Effect.gen(function*() {
      const dbPath = yield* makeTempDb

      const clientLayer = SqliteCrClient.layerConfig({
        filename: dbPath
      })

      yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        // Test basic functionality first to ensure it works
        yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)`
        yield* sql`INSERT INTO test (value) VALUES ('hello')`

        const results = yield* sql`SELECT * FROM test`
        assert.deepStrictEqual(results, [{ id: 1, value: "hello" }])

        // Verify that we got a proper SqlClient
        assert.ok(typeof sql === "function", "sql should be a function")
        assert.ok(typeof sql.withTransaction === "function", "withTransaction should be a function")
        assert.ok(sql.reserve !== undefined, "reserve should be defined")
      }).pipe(
        Effect.provide(clientLayer)
      )
    }))
})
