namespace yield_star {
  export const key = Symbol.for("fake yield*")
  export interface able<A> {
    [yield_star.key](): A
  }
  export const use = <A>(it: yield_star.able<A>): A => it[yield_star.key]()
}

class Runtime {
  static current: Runtime | null = null
  context = {} as Record<string, any>
}

class SqlClient {
  static _tag = "SqlClient"
  static [yield_star.key](): SqlClient {
    const it = Runtime.current?.context[SqlClient._tag]
    if (!it) throw new Error("No SqlClient in context. Did you forget to provide a layer?")
    return it
  }
  static layer() {
    return new SqlClient()
  }
  query(sql: string) {
    return `Result of ${sql}`
  }
}

const program = () => {
  const sql = yield_star.use(SqlClient)
  const results = sql.query("SELECT * FROM users")
  console.log(results)
}

const runnableProgram = (() => {
  const runtime = new Runtime()
  runtime.context[SqlClient._tag] = SqlClient.layer()
  return () => {
    const prev = Runtime.current
    Runtime.current = runtime
    program()
    Runtime.current = prev
  }
})()

runnableProgram()
