import { Command, CommandExecutor, FileSystem, Path } from "@effect/platform"
import { NodeCommandExecutor, NodeFileSystem, NodePath } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option, pipe } from "effect"

/**
 * Test Layer that provides all necessary dependencies for Command execution
 */
const TestLive = NodeCommandExecutor.layer.pipe(
  Layer.provideMerge(NodeFileSystem.layer),
  Layer.merge(NodePath.layer)
)

/**
 * Helper to run effects with the test layer
 */
const runPromise = <E, A>(
  self: Effect.Effect<A, E, CommandExecutor.CommandExecutor | FileSystem.FileSystem | Path.Path>
) => Effect.runPromise(Effect.provide(self, TestLive))

/**
 * Create a temporary SQLite database file for testing
 */
const makeTempDb = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const tempDir = yield* fs.makeTempDirectoryScoped()
  const dbPath = `${tempDir}/test.db`
  return dbPath
})

/**
 * Execute sqlite-cr command with given SQL and return the output
 */
const execSqliteCr = (dbPath: string, sql: string) =>
  Effect.gen(function*() {
    // Execute sqlite-cr with the SQL command
    const command = Command.make("sqlite-cr", dbPath, sql)
    const result = yield* Command.string(command)
    return result.trim()
  })

/**
 * Execute sqlite-cr command and parse JSON output for SELECT queries
 */
const execSqliteQuery = (dbPath: string, sql: string) =>
  Effect.gen(function*() {
    // For SELECT queries, use -json flag
    const command = Command.make("sqlite-cr", "-json", dbPath, sql)
    const result = yield* Command.string(command)
    
    if (result.trim() === "") {
      return []
    }
    
    try {
      return JSON.parse(result.trim())
    } catch {
      // If JSON parsing fails, return raw result
      return result.trim()
    }
  })

describe("SqliteCr CLI Integration", () => {
  it.scoped("should be available in PATH", () =>
    runPromise(Effect.gen(function*() {
      // Test that sqlite-cr command is available
      const command = Command.make("sqlite-cr", "-version")
      const result = yield* Command.string(command)
      
      // Should not be empty and should contain version info
      assert.ok(result.length > 0)
      // Real sqlite-cr shows SQLite version since it's based on SQLite
      assert.ok(result.includes("3."))
    })))

  it.scoped("should create and query database", () =>
    runPromise(Effect.gen(function*() {
      const dbPath = yield* makeTempDb
      
      // Create a table
      yield* execSqliteCr(dbPath, "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)")
      
      // Insert some data
      yield* execSqliteCr(dbPath, "INSERT INTO users (name, age) VALUES ('Alice', 30)")
      yield* execSqliteCr(dbPath, "INSERT INTO users (name, age) VALUES ('Bob', 25)")
      
      // Query the data
      const results = yield* execSqliteQuery(dbPath, "SELECT * FROM users ORDER BY id")
      
      assert.deepStrictEqual(results, [
        { id: 1, name: "Alice", age: 30 },
        { id: 2, name: "Bob", age: 25 }
      ])
    })))

  it.scoped("should handle SELECT with WHERE clause", () =>
    runPromise(Effect.gen(function*() {
      const dbPath = yield* makeTempDb
      
      // Setup
      yield* execSqliteCr(dbPath, "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL)")
      yield* execSqliteCr(dbPath, "INSERT INTO products (name, price) VALUES ('Widget', 19.99)")
      yield* execSqliteCr(dbPath, "INSERT INTO products (name, price) VALUES ('Gadget', 29.99)")
      yield* execSqliteCr(dbPath, "INSERT INTO products (name, price) VALUES ('Tool', 9.99)")
      
      // Query with WHERE clause
      const results = yield* execSqliteQuery(dbPath, "SELECT name, price FROM products WHERE price > 15.0 ORDER BY price")
      
      assert.deepStrictEqual(results, [
        { name: "Widget", price: 19.99 },
        { name: "Gadget", price: 29.99 }
      ])
    })))

  it.scoped("should handle UPDATE operations", () =>
    runPromise(Effect.gen(function*() {
      const dbPath = yield* makeTempDb
      
      // Setup
      yield* execSqliteCr(dbPath, "CREATE TABLE inventory (id INTEGER PRIMARY KEY, item TEXT, quantity INTEGER)")
      yield* execSqliteCr(dbPath, "INSERT INTO inventory (item, quantity) VALUES ('apples', 10)")
      yield* execSqliteCr(dbPath, "INSERT INTO inventory (item, quantity) VALUES ('oranges', 5)")
      
      // Update
      yield* execSqliteCr(dbPath, "UPDATE inventory SET quantity = 15 WHERE item = 'apples'")
      
      // Verify update
      const results = yield* execSqliteQuery(dbPath, "SELECT * FROM inventory ORDER BY item")
      
      assert.deepStrictEqual(results, [
        { id: 1, item: "apples", quantity: 15 },
        { id: 2, item: "oranges", quantity: 5 }
      ])
    })))

  it.scoped("should handle DELETE operations", () =>
    runPromise(Effect.gen(function*() {
      const dbPath = yield* makeTempDb
      
      // Setup
      yield* execSqliteCr(dbPath, "CREATE TABLE temp_data (id INTEGER PRIMARY KEY, value TEXT)")
      yield* execSqliteCr(dbPath, "INSERT INTO temp_data (value) VALUES ('keep')")
      yield* execSqliteCr(dbPath, "INSERT INTO temp_data (value) VALUES ('delete')")
      yield* execSqliteCr(dbPath, "INSERT INTO temp_data (value) VALUES ('keep')")
      
      // Delete
      yield* execSqliteCr(dbPath, "DELETE FROM temp_data WHERE value = 'delete'")
      
      // Verify deletion
      const results = yield* execSqliteQuery(dbPath, "SELECT * FROM temp_data ORDER BY id")
      
      assert.deepStrictEqual(results, [
        { id: 1, value: "keep" },
        { id: 3, value: "keep" }
      ])
    })))

  it.scoped("should handle transactions", () =>
    runPromise(Effect.gen(function*() {
      const dbPath = yield* makeTempDb
      
      // Setup
      yield* execSqliteCr(dbPath, "CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT, balance REAL)")
      yield* execSqliteCr(dbPath, "INSERT INTO accounts (name, balance) VALUES ('Alice', 100.0)")
      yield* execSqliteCr(dbPath, "INSERT INTO accounts (name, balance) VALUES ('Bob', 50.0)")
      
      // Transaction - transfer money from Alice to Bob
      yield* execSqliteCr(dbPath, "BEGIN TRANSACTION")
      yield* execSqliteCr(dbPath, "UPDATE accounts SET balance = balance - 25.0 WHERE name = 'Alice'")
      yield* execSqliteCr(dbPath, "UPDATE accounts SET balance = balance + 25.0 WHERE name = 'Bob'")
      yield* execSqliteCr(dbPath, "COMMIT")
      
      // Verify transaction
      const results = yield* execSqliteQuery(dbPath, "SELECT * FROM accounts ORDER BY name")
      
      assert.deepStrictEqual(results, [
        { id: 1, name: "Alice", balance: 75.0 },
        { id: 2, name: "Bob", balance: 75.0 }
      ])
    })))

  it.scoped("should handle complex queries with JOINs", () =>
    runPromise(Effect.gen(function*() {
      const dbPath = yield* makeTempDb
      
      // Setup tables with foreign key relationship
      yield* execSqliteCr(dbPath, "CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT)")
      yield* execSqliteCr(dbPath, "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER)")
      
      // Insert data
      yield* execSqliteCr(dbPath, "INSERT INTO categories (name) VALUES ('Electronics')")
      yield* execSqliteCr(dbPath, "INSERT INTO categories (name) VALUES ('Books')")
      yield* execSqliteCr(dbPath, "INSERT INTO items (name, category_id) VALUES ('Laptop', 1)")
      yield* execSqliteCr(dbPath, "INSERT INTO items (name, category_id) VALUES ('Phone', 1)")
      yield* execSqliteCr(dbPath, "INSERT INTO items (name, category_id) VALUES ('Novel', 2)")
      
      // Query with JOIN
      const results = yield* execSqliteQuery(
        dbPath, 
        "SELECT i.name as item_name, c.name as category_name FROM items i JOIN categories c ON i.category_id = c.id ORDER BY i.name"
      )
      
      assert.deepStrictEqual(results, [
        { item_name: "Laptop", category_name: "Electronics" },
        { item_name: "Novel", category_name: "Books" },
        { item_name: "Phone", category_name: "Electronics" }
      ])
    })))

  it.scoped("should integrate with SqlClient patterns", () =>
    runPromise(Effect.gen(function*() {
      const dbPath = yield* makeTempDb
      
      // This test demonstrates how sqlite-cr CLI can be used in a SqlClient-like pattern
      // In a real implementation, this would be wrapped in a proper SqlClient
      
      // Setup a schema similar to what SqlClient would use
      yield* execSqliteCr(dbPath, `
        CREATE TABLE IF NOT EXISTS effect_migrations (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `)
      
      yield* execSqliteCr(dbPath, `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `)
      
      // Insert test data
      yield* execSqliteCr(dbPath, "INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')")
      yield* execSqliteCr(dbPath, "INSERT INTO users (email, name) VALUES ('bob@example.com', 'Bob')")
      
      // Demonstrate complex query patterns that SqlClient would support
      const userCount = yield* execSqliteQuery(dbPath, "SELECT COUNT(*) as count FROM users")
      assert.deepStrictEqual(userCount, [{ count: 2 }])
      
      // Demonstrate pagination-like query
      const usersPage = yield* execSqliteQuery(
        dbPath, 
        "SELECT id, email, name FROM users ORDER BY created_at DESC LIMIT 1 OFFSET 0"
      )
      assert.strictEqual(usersPage.length, 1)
      assert.ok(usersPage[0].email === "bob@example.com")
      
      // Demonstrate migration tracking
      yield* execSqliteCr(dbPath, "INSERT INTO effect_migrations (name) VALUES ('001_create_users')")
      const migrations = yield* execSqliteQuery(dbPath, "SELECT name FROM effect_migrations ORDER BY created_at")
      assert.deepStrictEqual(migrations, [{ name: "001_create_users" }])
    })))

  it.scoped("should demonstrate SqlClient integration pattern", () =>
    runPromise(Effect.gen(function*() {
      const dbPath = yield* makeTempDb
      
      // This test demonstrates how the SqlClient would work once fully integrated
      // For now, we simulate the SqlClient behavior using the CLI interface
      
      // SqlClient would provide this layer:
      // const SqliteCrLive = SqliteCrClient.layerConfig({ filename: dbPath })
      
      // And then you could use it like this:
      // const program = Effect.gen(function*() {
      //   const sql = yield* SqlClient.SqlClient
      //   yield* sql`CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT, content TEXT)`
      //   yield* sql`INSERT INTO posts (title, content) VALUES ('Hello', 'World')`
      //   const posts = yield* sql`SELECT * FROM posts`
      //   return posts
      // })
      
      // For this test, we simulate what the SqlClient would do:
      yield* execSqliteCr(dbPath, "CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT, content TEXT)")
      yield* execSqliteCr(dbPath, "INSERT INTO posts (title, content) VALUES ('Hello', 'World')")
      yield* execSqliteCr(dbPath, "INSERT INTO posts (title, content) VALUES ('Effect', 'is awesome')")
      
      const posts = yield* execSqliteQuery(dbPath, "SELECT * FROM posts ORDER BY id")
      
      assert.deepStrictEqual(posts, [
        { id: 1, title: "Hello", content: "World" },
        { id: 2, title: "Effect", content: "is awesome" }
      ])
      
      // Verify we can also do complex operations that SqlClient supports
      const count = yield* execSqliteQuery(dbPath, "SELECT COUNT(*) as total FROM posts")
      assert.deepStrictEqual(count, [{ total: 2 }])
      
      // Demonstrate transaction-like behavior
      yield* execSqliteCr(dbPath, "BEGIN TRANSACTION")
      yield* execSqliteCr(dbPath, "INSERT INTO posts (title, content) VALUES ('Transaction', 'Test')")
      yield* execSqliteCr(dbPath, "COMMIT")
      
      const finalCount = yield* execSqliteQuery(dbPath, "SELECT COUNT(*) as total FROM posts")
      assert.deepStrictEqual(finalCount, [{ total: 3 }])
    })))
})