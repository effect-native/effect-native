import type { GraphDbService } from "@effect-native/graph-db"
import * as Effect from "effect/Effect"
import type { QueryProfile } from "./types.js"

type HelperName = "outIds" | "inIds" | "twoHop" | "intersection" | "difference" | "topNByCount"

export interface QueryProfileState {
  edgeOutCalls: number
  edgeInCalls: number
  nodeGetCalls: number
  rowsTraversed: number
  helperCallCounts: Record<HelperName, number>
  repeatedPatterns: Record<string, number>
  startedAt: number
}

export const makeQueryProfileState = (): QueryProfileState => ({
  edgeOutCalls: 0,
  edgeInCalls: 0,
  nodeGetCalls: 0,
  rowsTraversed: 0,
  helperCallCounts: {
    outIds: 0,
    inIds: 0,
    twoHop: 0,
    intersection: 0,
    difference: 0,
    topNByCount: 0
  },
  repeatedPatterns: {},
  startedAt: Date.now()
})

const countHelper = (state: QueryProfileState, helper: HelperName): void => {
  state.helperCallCounts[helper] = state.helperCallCounts[helper] + 1
}

export const countNodeGet = (state: QueryProfileState): void => {
  state.nodeGetCalls = state.nodeGetCalls + 1
}

export const notePattern = (state: QueryProfileState, pattern: string): void => {
  const current = state.repeatedPatterns[pattern] ?? 0
  state.repeatedPatterns[pattern] = current + 1
}

export const finalizeQueryProfile = (state: QueryProfileState): QueryProfile => ({
  edgeOutCalls: state.edgeOutCalls,
  edgeInCalls: state.edgeInCalls,
  nodeGetCalls: state.nodeGetCalls,
  rowsTraversed: state.rowsTraversed,
  elapsedMs: Date.now() - state.startedAt,
  helperCallCounts: { ...state.helperCallCounts },
  repeatedPatterns: { ...state.repeatedPatterns }
})

export const outIds = (
  db: GraphDbService,
  src: string,
  edgeType: string | undefined,
  state: QueryProfileState
) =>
  Effect.gen(function*() {
    countHelper(state, "outIds")
    state.edgeOutCalls = state.edgeOutCalls + 1

    const edges = yield* db.edge.out(src, edgeType)
    state.rowsTraversed = state.rowsTraversed + edges.length
    return edges.map((edge) => edge.dst)
  })

export const inIds = (
  db: GraphDbService,
  dst: string,
  edgeType: string | undefined,
  state: QueryProfileState
) =>
  Effect.gen(function*() {
    countHelper(state, "inIds")
    state.edgeInCalls = state.edgeInCalls + 1

    const edges = yield* db.edge.in(dst, edgeType)
    state.rowsTraversed = state.rowsTraversed + edges.length
    return edges.map((edge) => edge.src)
  })

export const twoHop = (
  db: GraphDbService,
  src: string,
  edgeType: string,
  state: QueryProfileState
) =>
  Effect.gen(function*() {
    countHelper(state, "twoHop")
    notePattern(state, `out(${edgeType})->out(${edgeType})`)

    const firstHop = yield* outIds(db, src, edgeType, state)
    const sortedFirstHop = [...firstHop].sort()
    const secondHop = new Set<string>()

    for (const hop of sortedFirstHop) {
      const second = yield* outIds(db, hop, edgeType, state)
      for (const id of second) {
        secondHop.add(id)
      }
    }

    return secondHop
  })

export const intersection = <A>(
  left: ReadonlySet<A>,
  right: ReadonlySet<A>,
  state: QueryProfileState
): ReadonlySet<A> => {
  countHelper(state, "intersection")
  state.rowsTraversed = state.rowsTraversed + left.size + right.size

  const output = new Set<A>()
  for (const item of left) {
    if (right.has(item)) {
      output.add(item)
    }
  }
  return output
}

export const difference = <A>(
  left: ReadonlySet<A>,
  right: ReadonlySet<A>,
  state: QueryProfileState
): ReadonlySet<A> => {
  countHelper(state, "difference")
  state.rowsTraversed = state.rowsTraversed + left.size + right.size

  const output = new Set<A>()
  for (const item of left) {
    if (!right.has(item)) {
      output.add(item)
    }
  }
  return output
}

export const topNByCount = <K>(
  counts: ReadonlyMap<K, number>,
  limit: number,
  state: QueryProfileState
): ReadonlyArray<readonly [K, number]> => {
  countHelper(state, "topNByCount")
  state.rowsTraversed = state.rowsTraversed + counts.size

  const ordered = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1]
    }

    return String(left[0]).localeCompare(String(right[0]))
  })

  return ordered.slice(0, limit)
}
