// Minimal ambient declarations for bun:test to satisfy type-checking
// in environments where @types/bun is not installed.
declare module "bun:test" {
  interface TestFn {
    (name: string, fn: () => void | Promise<void>, timeout?: number): void
    skip: any
    only: any
    failing: any
    todo: any
  }
  export const test: TestFn
  export const describe: any
  export const beforeAll: any
  export const beforeEach: any
  export const afterAll: any
  export const afterEach: any
  export const expect: any
  export const jest: any
  export const mock: any
  export const setDefaultTimeout: any
  export const setSystemTime: any
  export const spyOn: any
}
