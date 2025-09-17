import { Hydration, RegistryContext, Result } from "@effect-atom/atom-react"
import * as AtomHooks from "@effect-atom/atom-react/Hooks"
import { HydrationBoundary } from "@effect-atom/atom-react/ReactHydration"
import * as Atom from "@effect-atom/atom/Atom"
import * as Registry from "@effect-atom/atom/Registry"
import { act, render, screen, waitFor } from "@testing-library/react"
import { Cause, Effect, Schema, Stream } from "effect"
import { Suspense } from "react"
import { renderToString } from "react-dom/server"
import { ErrorBoundary } from "react-error-boundary"
import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest"

describe("atom-react", () => {
  let registry: Registry.Registry

  beforeEach(() => {
    registry = Registry.make()
  })

  describe("useAtomValue", () => {
    test("should read value from simple Atom", () => {
      const atom = Atom.make(42)

      function TestComponent() {
        const value = AtomHooks.useAtomValue(atom)
        return <div data-testid="simple-value">{value}</div>
      }

      const { getByTestId } = render(<TestComponent />)

      expect(getByTestId("simple-value")).toHaveTextContent("42")
    })

    test("should read value with transform function", () => {
      const atom = Atom.make(42)

      function TestComponent() {
        const value = AtomHooks.useAtomValue(atom, (x) => x * 2)
        return <div data-testid="transformed-value">{value}</div>
      }

      const { getByTestId } = render(<TestComponent />)

      expect(getByTestId("transformed-value")).toHaveTextContent("84")
    })

    test("should update when Atom value changes", async () => {
      const atom = Atom.make("initial")

      function TestComponent() {
        const value = AtomHooks.useAtomValue(atom)
        return <div data-testid="updating-value">{value}</div>
      }

      const { getByTestId } = render(
        <RegistryContext.Provider value={registry}>
          <TestComponent />
        </RegistryContext.Provider>
      )

      expect(getByTestId("updating-value")).toHaveTextContent("initial")

      act(() => {
        registry.set(atom, "updated")
      })

      await waitFor(() => {
        expect(getByTestId("updating-value")).toHaveTextContent("updated")
      })
    })

    test("should work with computed Atom", () => {
      const baseAtom = Atom.make(10)
      const computedAtom = Atom.make((get) => get(baseAtom) * 2)

      function TestComponent() {
        const value = AtomHooks.useAtomValue(computedAtom)
        return <div data-testid="computed-value">{value}</div>
      }

      const { getByTestId } = render(<TestComponent />)

      expect(getByTestId("computed-value")).toHaveTextContent("20")
    })

    test("suspense success", () => {
      const atom = Atom.make(Effect.never)

      function TestComponent() {
        const value = AtomHooks.useAtomSuspense(atom).value
        return <div data-testid="value">{value}</div>
      }

      render(
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <TestComponent />
        </Suspense>
      )

      expect(screen.getByTestId("loading")).toBeInTheDocument()
    })
  })

  test("suspense error", () => {
    const atom = Atom.make(Effect.fail(new Error("test")))
    function TestComponent() {
      const value = AtomHooks.useAtomSuspense(atom).value
      return <div data-testid="value">{value}</div>
    }

    render(
      <ErrorBoundary fallback={<div data-testid="error">Error</div>}>
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <TestComponent />
        </Suspense>
      </ErrorBoundary>,
      {
        onCaughtError: ((error: unknown) => {
          if (error instanceof Error && error.message === "test") {
            return
          }
          // eslint-disable-next-line no-console
          console.error(error)
        }) // todo: fix idk why the types are weird
      } as unknown as undefined
    )

    expect(screen.getByTestId("error")).toBeInTheDocument()
  })

  test("hydration", () => {
    const atomBasic = Atom.make(0).pipe(
      Atom.serializable({
        key: "basic",
        schema: Schema.Number
      })
    )
    const e: Effect.Effect<number, string> = Effect.never
    const makeAtomResult = (key: string) =>
      Atom.make(e).pipe(
        Atom.serializable({
          key,
          schema: Result.Schema({
            success: Schema.Number,
            error: Schema.String
          })
        })
      )

    const atomResult1 = makeAtomResult("success")
    const atomResult2 = makeAtomResult("errored")
    const atomResult3 = makeAtomResult("pending")

    const dehydratedState: Array<Hydration.DehydratedAtom> = [
      {
        key: "basic",
        value: 1,
        dehydratedAt: Date.now()
      },
      {
        key: "success",
        value: {
          _tag: "Success",
          value: 123,
          waiting: false,
          timestamp: Date.now()
        },
        dehydratedAt: Date.now()
      },
      {
        key: "errored",
        value: {
          _tag: "Failure",
          cause: {
            _tag: "Fail",
            error: "error"
          },
          previousSuccess: {
            _tag: "None"
          },
          waiting: false
        },
        dehydratedAt: Date.now()
      },
      {
        key: "pending",
        value: {
          _tag: "Initial",
          waiting: true
        },
        dehydratedAt: Date.now()
      }
    ]

    function Basic() {
      const value = AtomHooks.useAtomValue(atomBasic)
      return <div data-testid="hydration-basic-value">{value}</div>
    }

    function Result1() {
      const value = AtomHooks.useAtomValue(atomResult1)
      return Result.match(value, {
        onSuccess: (value) => <div data-testid="value-1">{value.value}</div>,
        onFailure: () => <div data-testid="error-1">Error</div>,
        onInitial: () => <div data-testid="loading-1">Loading...</div>
      })
    }

    function Result2() {
      const value = AtomHooks.useAtomValue(atomResult2)
      return Result.match(value, {
        onSuccess: (value) => <div data-testid="value-2">{value.value}</div>,
        onFailure: () => <div data-testid="error-2">Error</div>,
        onInitial: () => <div data-testid="loading-2">Loading...</div>
      })
    }

    function Result3() {
      const value = AtomHooks.useAtomValue(atomResult3)
      return Result.match(value, {
        onSuccess: (value) => <div data-testid="value-3">{value.value}</div>,
        onFailure: () => <div data-testid="error-3">Error</div>,
        onInitial: () => <div data-testid="loading-3">Loading...</div>
      })
    }

    const { getByTestId } = render(
      <HydrationBoundary state={dehydratedState}>
        <Basic />
        <Result1 />
        <Result2 />
        <Result3 />
      </HydrationBoundary>
    )

    expect(getByTestId("hydration-basic-value")).toHaveTextContent("1")
    expect(getByTestId("value-1")).toHaveTextContent("123")
    expect(getByTestId("error-2")).toBeInTheDocument()
    expect(getByTestId("loading-3")).toBeInTheDocument()
  })

  test("hydration streaming", async () => {
    const latch = Effect.runSync(Effect.makeLatch())
    let start = 0
    let stop = 0
    const atom = Atom.make(
      Effect.gen(function* () {
        start = start + 1
        yield* latch.await
        stop = stop + 1
        return 1
      })
    ).pipe(
      Atom.serializable({
        key: "test",
        schema: Result.Schema({
          success: Schema.Number
        })
      })
    )

    registry.mount(atom)

    expect(start).toBe(1)
    expect(stop).toBe(0)

    const dehydratedState = Hydration.dehydrate(registry, {
      encodeInitialAs: "promise"
    })

    function TestComponent() {
      const value = AtomHooks.useAtomValue(atom)
      return <div data-testid="hydration-stream-value">{value._tag}</div>
    }

    const { getByTestId } = render(
      // provide a fresh registry each time to simulate hydration
      <RegistryContext.Provider value={Registry.make()}>
        <HydrationBoundary state={dehydratedState}>
          <TestComponent />
        </HydrationBoundary>
      </RegistryContext.Provider>
    )

    expect(getByTestId("hydration-stream-value")).toHaveTextContent("Initial")

    act(() => {
      Effect.runSync(latch.open)
    })
    await Effect.runPromise(latch.await)

    const test = registry.get(atom)
    expect(test._tag).toBe("Success")
    if (test._tag === "Success") {
      expect(test.value).toBe(1)
    }

    expect(getByTestId("hydration-stream-value")).toHaveTextContent("Success")
    expect(start).toBe(1)
    expect(stop).toBe(1)
  })

  describe("stream atoms", () => {
    test("Atom.make(Stream.make(1)) yields Success immediately after mount", () => {
      const streamAtom = Atom.make(Stream.make(1))

      registry.mount(streamAtom)

      const state = registry.get(streamAtom)

      expect(state._tag).toBe("Success")
      if (state._tag === "Success") {
        expect(state.value).toBe(1)
        expect(state.waiting).toBe(false)
      }
    })

    test("Atom.make(Stream.make(1, 2)) keeps the most recent element", () => {
      const streamAtom = Atom.make(Stream.make(1, 2))

      registry.mount(streamAtom)

      const state = registry.get(streamAtom)

      expect(state._tag).toBe("Success")
      if (state._tag === "Success") {
        expect(state.value).toBe(2)
        expect(state.waiting).toBe(false)
      }
    })

    test("Atom.pull(Stream.make(1, 2)) pulls the first chunk on mount", () => {
      const pullAtom = Atom.pull(Stream.make(1, 2))

      registry.mount(pullAtom)

      const initial = registry.get(pullAtom)
      expect(initial._tag).toBe("Success")
      if (initial._tag === "Success") {
        expect(initial.value.items).toEqual([1, 2])
        expect(initial.value.done).toBe(false)
        expect(initial.waiting).toBe(false)
      }

      registry.set(pullAtom, undefined as void)

      const second = registry.get(pullAtom)

      expect(second._tag).toBe("Success")
      if (second._tag === "Success") {
        expect(second.value.items).toEqual([1, 2])
        expect(second.value.done).toBe(true)
      }
    })

    test("Atom.pull keeps returning the final chunk when stream is exhausted", () => {
      const pullAtom = Atom.pull(Stream.make(1))

      registry.mount(pullAtom)

      expect(registry.get(pullAtom)._tag).toBe("Success")

      registry.set(pullAtom, undefined as void)

      registry.set(pullAtom, undefined as void)

      const exhausted = registry.get(pullAtom)
      expect(exhausted._tag).toBe("Success")
      if (exhausted._tag === "Success") {
        expect(exhausted.value.items).toEqual([1])
        expect(exhausted.value.done).toBe(true)
      }
    })
  })

  describe("SSR", () => {
    it("should run atom's during SSR by default", () => {
      const getCount = vi.fn(() => 0)
      const counterAtom = Atom.make(getCount)

      function TestComponent() {
        const count = AtomHooks.useAtomValue(counterAtom)
        return <div>{count}</div>
      }

      function App() {
        return <TestComponent />
      }

      const ssrHtml = renderToString(<App />)

      expect(getCount).toHaveBeenCalled()
      expect(ssrHtml).toContain("0")

      render(<App />)

      expect(getCount).toHaveBeenCalled()
      expect(screen.getByText("0")).toBeInTheDocument()
    })
  })

  it("should not execute Atom effects during SSR when using withServerSnapshot", () => {
    const mockFetchData = vi.fn(() => 0)

    const userDataAtom = Atom.make(Effect.sync(() => mockFetchData())).pipe(
      Atom.withServerValueInitial
    )

    function TestComponent() {
      const result = AtomHooks.useAtomValue(userDataAtom)

      return <div>{result._tag}</div>
    }

    function App() {
      return <TestComponent />
    }

    const ssrHtml = renderToString(<App />)

    expect(mockFetchData).not.toHaveBeenCalled()
    expect(ssrHtml).toContain("Initial")

    render(<App />)

    expect(mockFetchData).toHaveBeenCalled()
    expect(screen.getByText("Success")).toBeInTheDocument()
  })
})
