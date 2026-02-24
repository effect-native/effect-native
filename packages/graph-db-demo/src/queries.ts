import { type GraphDbService, GraphInvariantError } from "@effect-native/graph-db"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
  countNodeGet,
  difference,
  intersection,
  notePattern,
  outIds,
  type QueryProfileState,
  topNByCount,
  twoHop
} from "./queryHelpers.js"
import { Photo, type PhotoRecommendation, SocialEdgeType } from "./types.js"

export interface PhotosLikedByFriendsOfFriendsArgs {
  readonly db: GraphDbService
  readonly userId: string
  readonly limit: number
  readonly profile: QueryProfileState
}

export const photosLikedByFriendsOfFriends = ({
  db,
  userId,
  limit,
  profile
}: PhotosLikedByFriendsOfFriendsArgs) =>
  Effect.gen(function*() {
    const directFriends = yield* outIds(db, userId, SocialEdgeType.Friend, profile)
    const directFriendSet = new Set(directFriends)

    const secondHop = yield* twoHop(db, userId, SocialEdgeType.Friend, profile)
    const blocked = new Set<string>([userId, ...directFriends])

    notePattern(profile, "set-intersection(second-hop,blocked)")
    intersection(secondHop, blocked, profile)
    const friendOfFriendSet = difference(secondHop, blocked, profile)

    const likedByPhoto = new Map<string, Set<string>>()
    const sortedFriendOfFriendIds = [...friendOfFriendSet].sort()

    for (const friendOfFriendId of sortedFriendOfFriendIds) {
      const likedPhotos = yield* outIds(db, friendOfFriendId, SocialEdgeType.LikedPhoto, profile)
      for (const photoId of likedPhotos) {
        const current = likedByPhoto.get(photoId) ?? new Set<string>()
        current.add(friendOfFriendId)
        likedByPhoto.set(photoId, current)
      }
    }

    const likeCounts = new Map<string, number>()
    for (const [photoId, supporters] of likedByPhoto) {
      likeCounts.set(photoId, supporters.size)
    }

    notePattern(profile, "topNByCount(photo-supporters)")
    const ranked = topNByCount(likeCounts, limit, profile)

    const recommendations: Array<PhotoRecommendation> = []

    for (const [photoId, count] of ranked) {
      countNodeGet(profile)
      const photoRaw = yield* db.node.get("photo", photoId)
      if (photoRaw === null) {
        return yield* new GraphInvariantError({
          context: "query.photo-hydration",
          detail: `Photo ${photoId} was referenced by likes but missing from node table`
        })
      }

      const photo = yield* Schema.decodeUnknownEffect(Photo)(photoRaw)
      const supporters = likedByPhoto.get(photoId) ?? new Set<string>()
      const sampleFriendOfFriendIds = [...supporters].sort().slice(0, 5)

      recommendations.push({
        photoId,
        photo,
        likedByFriendOfFriendCount: count,
        sampleFriendOfFriendIds
      })
    }

    return {
      directFriendSet,
      friendOfFriendSet,
      recommendations
    } as const
  })
