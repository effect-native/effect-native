declare module "better-sqlite3" {
  export interface Statement {
    get(...params: ReadonlyArray<unknown>): unknown
  }

  export default class Database {
    constructor(filename: string, options?: Readonly<Record<string, unknown>>)
    loadExtension(path: string): this
    prepare(sql: string): Statement
    close(): this
  }
}
