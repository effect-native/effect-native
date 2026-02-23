import { describe, expect, test } from "bun:test"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as BunTest from "../src/index.js"

describe("Equality Testing", () => {
  // Add equality testers first
  BunTest.addEqualityTesters()

  describe("Equal.equals support", () => {
    class Person implements Equal.Equal {
      constructor(readonly name: string, readonly age: number) {}

      [Equal.symbol](that: unknown): boolean {
        return that instanceof Person &&
          this.name === that.name &&
          this.age === that.age
      }

      [Hash.symbol](): number {
        return Hash.hash([this.name, this.age])
      }
    }

    test("should compare Equal instances correctly", () => {
      const person1 = new Person("Alice", 30)
      const person2 = new Person("Alice", 30)
      const person3 = new Person("Bob", 25)

      expect(person1).toEqual(person2)
      expect(person1).not.toEqual(person3)
    })

    BunTest.it.effect("should work with Effect values", () =>
      Effect.gen(function*() {
        const person1 = new Person("Charlie", 35)
        const person2 = new Person("Charlie", 35)

        const result1 = yield* Effect.succeed(person1)
        const result2 = yield* Effect.succeed(person2)

        expect(result1).toEqual(result2)
      }))
  })

  describe("Option equality", () => {
    test("should compare Options correctly", () => {
      expect(Option.some(42)).toEqual(Option.some(42))
      expect(Option.some(42)).not.toEqual(Option.some(43))
      expect(Option.none()).toEqual(Option.none())
      expect(Option.some(42)).not.toEqual(Option.none())
    })

    BunTest.it.effect("should compare Options in Effects", () =>
      Effect.gen(function*() {
        const opt1 = yield* Effect.succeed(Option.some("test"))
        const opt2 = yield* Effect.succeed(Option.some("test"))
        const opt3 = yield* Effect.succeed(Option.none())

        expect(opt1).toEqual(opt2)
        expect(opt1).not.toEqual(opt3)
      }))
  })

  describe("Result equality", () => {
    test("compares Results correctly", () => {
      expect(Result.succeed(42)).toEqual(Result.succeed(42))
      expect(Result.succeed(42)).not.toEqual(Result.succeed(43))
      expect(Result.fail("error")).toEqual(Result.fail("error"))
      expect(Result.succeed(42)).not.toEqual(Result.fail("error"))
    })

    BunTest.it.effect("compares Results in Effects", () =>
      Effect.gen(function*() {
        const result1 = yield* Effect.succeed(Result.succeed("success"))
        const result2 = yield* Effect.succeed(Result.succeed("success"))
        const result3 = yield* Effect.succeed(Result.fail("failure"))

        expect(result1).toEqual(result2)
        expect(result1).not.toEqual(result3)
      }))
  })

  describe("Nested structures", () => {
    test("compares nested Equal structures", () => {
      const nested1 = Option.some(Result.succeed(42))
      const nested2 = Option.some(Result.succeed(42))
      const nested3 = Option.some(Result.fail("error"))

      expect(nested1).toEqual(nested2)
      expect(nested1).not.toEqual(nested3)
    })

    BunTest.it.effect("handles complex nested structures", () =>
      Effect.gen(function*() {
        const complex1 = {
          option: Option.some(100),
          result: Result.succeed("ok"),
          array: [Option.some(1), Option.none()]
        }

        const complex2 = {
          option: Option.some(100),
          result: Result.succeed("ok"),
          array: [Option.some(1), Option.none()]
        }

        expect(complex1).toEqual(complex2)
      }))
  })
})
