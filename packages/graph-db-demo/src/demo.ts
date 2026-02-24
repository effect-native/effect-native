import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { runGraphDbDemo } from "./scenario.js"

const main = Effect.gen(function*() {
  const report = yield* runGraphDbDemo()

  yield* Console.log("graph-db-demo: photos liked by friends-of-friends")
  yield* Console.log(
    `seed=${report.seed.seed} users=${report.seed.shape.users} photos=${report.seed.shape.photos} posts=${report.seed.shape.posts}`
  )
  yield* Console.log(
    `edges(friend=${report.seed.shape.friendEdges}, liked_photo=${report.seed.shape.likedPhotoEdges}, commented_post=${report.seed.shape.commentedPostEdges})`
  )
  yield* Console.log(
    `query: user=${report.query.userId} limit=${report.query.limit} results=${report.topPhotos.length}`
  )

  yield* Console.log("top recommendations")
  for (const row of report.topPhotos.slice(0, 10)) {
    yield* Console.log(
      `- ${row.photoId} score=${row.likedByFriendOfFriendCount} sample_fof=${row.sampleFriendOfFriendIds.join(",")}`
    )
  }

  yield* Console.log("query profile")
  yield* Console.log(
    `edgeOutCalls=${report.profile.edgeOutCalls} edgeInCalls=${report.profile.edgeInCalls} nodeGetCalls=${report.profile.nodeGetCalls} rowsTraversed=${report.profile.rowsTraversed} elapsedMs=${report.profile.elapsedMs}`
  )
  yield* Console.log(`helperCalls=${JSON.stringify(report.profile.helperCallCounts)}`)
  yield* Console.log(`repeatedPatterns=${JSON.stringify(report.profile.repeatedPatterns)}`)

  yield* Console.log("affordance findings")
  for (const finding of report.affordanceFindings) {
    yield* Console.log(`- painPoint: ${finding.painPoint}`)
    yield* Console.log(`  repeatedPattern: ${finding.repeatedPattern}`)
    yield* Console.log(`  proposedHelper: ${finding.proposedHelper}`)
    yield* Console.log(`  proposedGraphDbExtraction: ${finding.proposedGraphDbExtraction}`)
  }

  yield* Console.log("json report")
  yield* Console.log(JSON.stringify(report, null, 2))
})

void Effect.runPromise(main)
