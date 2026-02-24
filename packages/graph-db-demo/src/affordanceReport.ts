import type { AffordanceFinding, QueryProfile } from "./types.js"

export const buildAffordanceReport = (profile: QueryProfile): ReadonlyArray<AffordanceFinding> => {
  const traversalPattern = "out(friend)->out(friend)"
  const traversalRepeats = profile.repeatedPatterns[traversalPattern] ?? 0

  return [
    {
      painPoint:
        `Multi-hop traversal required ${profile.edgeOutCalls} edge.out calls and ${profile.rowsTraversed} traversed rows.`,
      repeatedPattern: `${traversalPattern} repeated ${traversalRepeats} time(s)`,
      proposedHelper: "twoHopOut(srcId, edgeType)",
      proposedGraphDbExtraction:
        "GraphDb.edge.twoHopOut(src: string, edgeType: string): Effect<ReadonlySet<string>, ...>"
    },
    {
      painPoint: "Ranking FoF likes required repeated set joins (intersection/difference) and manual aggregation maps.",
      repeatedPattern: "set-intersection(second-hop,blocked) + difference(second-hop,blocked)",
      proposedHelper: "selectDistinctDstBySrcSet(srcIds, edgeType)",
      proposedGraphDbExtraction:
        "GraphDb.query.selectDistinctDstBySrcSet(srcIds: ReadonlyArray<string>, edgeType: string): Effect<ReadonlyMap<string, number>, ...>"
    },
    {
      painPoint: `Hydrating ranked entities needed ${profile.nodeGetCalls} individual node.get calls.`,
      repeatedPattern: "for each result id -> node.get(kind, id)",
      proposedHelper: "getMany(kind, ids)",
      proposedGraphDbExtraction:
        "GraphDb.node.getMany(kind: string, ids: ReadonlyArray<string>): Effect<ReadonlyMap<string, unknown>, ...>"
    }
  ]
}
