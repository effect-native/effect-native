import * as GraphDb from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Effect from "effect/Effect"
import { buildAffordanceReport } from "./affordanceReport.js"
import { photosLikedByFriendsOfFriends } from "./queries.js"
import { finalizeQueryProfile, makeQueryProfileState } from "./queryHelpers.js"
import type { PhotoRecommendation, SeedShape } from "./types.js"
import { Photo, Post, SocialEdgeType, User } from "./types.js"

const userNode = GraphDb.nodeDef({
  kind: "user",
  schema: User,
  columns: [
    { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
    { name: "name", sqlType: "TEXT", notNull: true }
  ],
  indexes: [{ name: "node_user_name_idx", columns: ["name"] }]
})

const photoNode = GraphDb.nodeDef({
  kind: "photo",
  schema: Photo,
  columns: [
    { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
    { name: "ownerId", sqlType: "TEXT", notNull: true },
    { name: "caption", sqlType: "TEXT", notNull: true }
  ],
  indexes: [
    { name: "node_photo_owner_idx", columns: ["ownerId"] }
  ]
})

const postNode = GraphDb.nodeDef({
  kind: "post",
  schema: Post,
  columns: [
    { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
    { name: "authorId", sqlType: "TEXT", notNull: true },
    { name: "text", sqlType: "TEXT", notNull: true }
  ],
  indexes: [
    { name: "node_post_author_idx", columns: ["authorId"] }
  ]
})

const graph = GraphDb.makeGraphDb({
  name: "social-graph-demo",
  nodes: [userNode, photoNode, postNode]
})

export const defaultMediumShape: SeedShape = {
  users: 600,
  photos: 2000,
  posts: 1200,
  friendEdges: 4800,
  likedPhotoEdges: 7000,
  commentedPostEdges: 3000
}

export const defaultSeed = 20260224
export const defaultQueryUserId = "u:0000"
export const defaultQueryLimit = 10

const padId = (value: number, width: number): string => value.toString().padStart(width, "0")
const userIdAt = (index: number): string => `u:${padId(index, 4)}`
const photoIdAt = (index: number): string => `ph:${padId(index, 5)}`
const postIdAt = (index: number): string => `post:${padId(index, 5)}`

interface Rng {
  readonly nextInt: (maxExclusive: number) => number
}

const makeRng = (seed: number): Rng => {
  let state = seed >>> 0

  const nextUint32 = (): number => {
    state = Math.imul(state, 1664525) + 1013904223
    state = state >>> 0
    return state
  }

  return {
    nextInt: (maxExclusive) => {
      if (maxExclusive <= 0) {
        return 0
      }
      return nextUint32() % maxExclusive
    }
  }
}

const directedKey = (src: string, dst: string): string => `${src}->${dst}`
const undirectedKey = (left: string, right: string): string => (left < right ? `${left}|${right}` : `${right}|${left}`)

const addFriendPair = (
  left: string,
  right: string,
  directed: Set<string>,
  undirected: Set<string>
): void => {
  if (left === right) {
    return
  }

  const pairKey = undirectedKey(left, right)
  if (undirected.has(pairKey)) {
    return
  }

  undirected.add(pairKey)
  directed.add(directedKey(left, right))
  directed.add(directedKey(right, left))
}

const parseDirectedKey = (key: string): readonly [string, string] => {
  const parts = key.split("->")
  const src = parts[0]
  const dst = parts[1]
  if (src === undefined || dst === undefined) {
    throw new Error(`Invalid directed key: ${key}`)
  }
  return [src, dst]
}

const parsePairKey = (key: string): readonly [string, string] => {
  const parts = key.split("|")
  const left = parts[0]
  const right = parts[1]
  if (left === undefined || right === undefined) {
    throw new Error(`Invalid pair key: ${key}`)
  }
  return [left, right]
}

const ensureValidShape = (shape: SeedShape): void => {
  if (shape.users < 6) {
    throw new Error(`Seed shape requires at least 6 users, received ${shape.users}`)
  }
  if (shape.photos < 3) {
    throw new Error(`Seed shape requires at least 3 photos, received ${shape.photos}`)
  }
  if (shape.friendEdges % 2 !== 0) {
    throw new Error(`friendEdges must be even for symmetric friend graph, received ${shape.friendEdges}`)
  }
}

const buildUsers = (shape: SeedShape) =>
  Array.from({ length: shape.users }, (_, index) => ({
    id: userIdAt(index),
    name: `User ${padId(index, 4)}`
  }))

const buildPhotos = (shape: SeedShape) =>
  Array.from({ length: shape.photos }, (_, index) => ({
    id: photoIdAt(index),
    ownerId: userIdAt(index % shape.users),
    caption: `Photo ${padId(index, 5)} from owner ${padId(index % shape.users, 4)}`
  }))

const buildPosts = (shape: SeedShape) =>
  Array.from({ length: shape.posts }, (_, index) => ({
    id: postIdAt(index),
    authorId: userIdAt(index % shape.users),
    text: `Post ${padId(index, 5)} by ${padId(index % shape.users, 4)}`
  }))

const seedNodes = (db: GraphDb.GraphDbService, shape: SeedShape) =>
  Effect.gen(function*() {
    const users = buildUsers(shape)
    const photos = buildPhotos(shape)
    const posts = buildPosts(shape)

    yield* Effect.forEach(users, (user) => db.node.put("user", user), { discard: true })
    yield* Effect.forEach(photos, (photo) => db.node.put("photo", photo), { discard: true })
    yield* Effect.forEach(posts, (post) => db.node.put("post", post), { discard: true })
  })

interface SeedEdgeSets {
  readonly friendDirected: Set<string>
  readonly likedPhotoPairs: Set<string>
  readonly commentedPostPairs: Set<string>
}

const buildSeedEdgeSets = (shape: SeedShape, seed: number): SeedEdgeSets => {
  ensureValidShape(shape)
  const rng = makeRng(seed)

  const friendDirected = new Set<string>()
  const friendUndirected = new Set<string>()
  const friendPairTarget = shape.friendEdges / 2

  const forcedFriendPairs: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 2],
    [0, 3],
    [3, 4],
    [1, 5],
    [3, 5]
  ]

  for (const [leftIndex, rightIndex] of forcedFriendPairs) {
    if (friendUndirected.size >= friendPairTarget) {
      break
    }
    if (leftIndex < shape.users && rightIndex < shape.users) {
      addFriendPair(userIdAt(leftIndex), userIdAt(rightIndex), friendDirected, friendUndirected)
    }
  }

  while (friendUndirected.size < friendPairTarget) {
    const left = userIdAt(rng.nextInt(shape.users))
    const right = userIdAt(rng.nextInt(shape.users))
    addFriendPair(left, right, friendDirected, friendUndirected)
  }

  const likedPhotoPairs = new Set<string>()
  const forcedLikes: ReadonlyArray<readonly [number, number]> = [
    [2, 0],
    [4, 0],
    [2, 1],
    [5, 1],
    [5, 2]
  ]

  for (const [userIndex, photoIndex] of forcedLikes) {
    if (likedPhotoPairs.size >= shape.likedPhotoEdges) {
      break
    }
    if (userIndex < shape.users && photoIndex < shape.photos) {
      likedPhotoPairs.add(`${userIdAt(userIndex)}|${photoIdAt(photoIndex)}`)
    }
  }

  while (likedPhotoPairs.size < shape.likedPhotoEdges) {
    likedPhotoPairs.add(`${userIdAt(rng.nextInt(shape.users))}|${photoIdAt(rng.nextInt(shape.photos))}`)
  }

  const commentedPostPairs = new Set<string>()
  while (commentedPostPairs.size < shape.commentedPostEdges) {
    commentedPostPairs.add(`${userIdAt(rng.nextInt(shape.users))}|${postIdAt(rng.nextInt(shape.posts))}`)
  }

  return {
    friendDirected,
    likedPhotoPairs,
    commentedPostPairs
  }
}

const seedEdges = (db: GraphDb.GraphDbService, shape: SeedShape, seed: number) =>
  Effect.gen(function*() {
    const edges = buildSeedEdgeSets(shape, seed)

    const sortedFriendEdges = [...edges.friendDirected].sort()
    for (const key of sortedFriendEdges) {
      const [src, dst] = parseDirectedKey(key)
      yield* db.edge.put(SocialEdgeType.Friend, src, dst)
    }

    const sortedLikeEdges = [...edges.likedPhotoPairs].sort()
    for (const key of sortedLikeEdges) {
      const [src, dst] = parsePairKey(key)
      yield* db.edge.put(SocialEdgeType.LikedPhoto, src, dst, { signal: "double_tap" })
    }

    const sortedCommentEdges = [...edges.commentedPostPairs].sort()
    for (const key of sortedCommentEdges) {
      const [src, dst] = parsePairKey(key)
      yield* db.edge.put(SocialEdgeType.CommentedPost, src, dst, { signal: "comment" })
    }
  })

const seedSocialGraph = (db: GraphDb.GraphDbService, shape: SeedShape, seed: number) =>
  Effect.gen(function*() {
    yield* seedNodes(db, shape)
    yield* seedEdges(db, shape, seed)
  })

export interface RunGraphDbDemoOptions {
  readonly seed?: number | undefined
  readonly shape?: SeedShape | undefined
  readonly userId?: string | undefined
  readonly limit?: number | undefined
}

const runDemoProgram = (options: RunGraphDbDemoOptions) =>
  Effect.gen(function*() {
    const shape = options.shape ?? defaultMediumShape
    const seed = options.seed ?? defaultSeed
    const userId = options.userId ?? defaultQueryUserId
    const limit = options.limit ?? defaultQueryLimit

    const db = yield* graph.GraphDb
    yield* db.ensure

    yield* seedSocialGraph(db, shape, seed)

    const profileState = makeQueryProfileState()
    const result = yield* photosLikedByFriendsOfFriends({
      db,
      userId,
      limit,
      profile: profileState
    })

    const profile = finalizeQueryProfile(profileState)
    const affordanceFindings = buildAffordanceReport(profile)

    return {
      query: {
        userId,
        limit
      },
      seed: {
        seed,
        shape
      },
      topPhotos: result.recommendations,
      profile,
      affordanceFindings
    }
  })

export const runGraphDbDemo = (options: RunGraphDbDemoOptions = {}) =>
  runDemoProgram(options).pipe(
    Effect.provide(graph.layer),
    Effect.provide(GraphDb.GraphDialectSqlite.layer()),
    Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
  )

const seedTinyFixture = (db: GraphDb.GraphDbService) =>
  Effect.gen(function*() {
    const users = [
      { id: "u:0000", name: "Alice" },
      { id: "u:0001", name: "Bob" },
      { id: "u:0002", name: "Cara" },
      { id: "u:0003", name: "Dan" },
      { id: "u:0004", name: "Eve" },
      { id: "u:0005", name: "Finn" }
    ]

    const photos = [
      { id: "ph:00000", ownerId: "u:0002", caption: "Sunset" },
      { id: "ph:00001", ownerId: "u:0004", caption: "Hiking" },
      { id: "ph:00002", ownerId: "u:0005", caption: "Pizza" }
    ]

    const posts = [
      { id: "post:00000", authorId: "u:0001", text: "Hello graph" },
      { id: "post:00001", authorId: "u:0003", text: "Edge cases matter" }
    ]

    for (const user of users) {
      yield* db.node.put("user", user)
    }
    for (const photo of photos) {
      yield* db.node.put("photo", photo)
    }
    for (const post of posts) {
      yield* db.node.put("post", post)
    }

    const friendPairs: ReadonlyArray<readonly [string, string]> = [
      ["u:0000", "u:0001"],
      ["u:0001", "u:0002"],
      ["u:0000", "u:0003"],
      ["u:0003", "u:0004"],
      ["u:0001", "u:0005"],
      ["u:0003", "u:0005"]
    ]

    for (const [left, right] of friendPairs) {
      yield* db.edge.put(SocialEdgeType.Friend, left, right)
      yield* db.edge.put(SocialEdgeType.Friend, right, left)
    }

    const likes: ReadonlyArray<readonly [string, string]> = [
      ["u:0002", "ph:00000"],
      ["u:0004", "ph:00000"],
      ["u:0002", "ph:00001"],
      ["u:0005", "ph:00001"],
      ["u:0005", "ph:00002"]
    ]

    for (const [src, dst] of likes) {
      yield* db.edge.put(SocialEdgeType.LikedPhoto, src, dst)
    }
  })

export const runTinyFixtureQuery = (limit = 10) =>
  Effect.gen(function*() {
    const db = yield* graph.GraphDb
    yield* db.ensure
    yield* seedTinyFixture(db)

    const profileState = makeQueryProfileState()
    const result = yield* photosLikedByFriendsOfFriends({
      db,
      userId: "u:0000",
      limit,
      profile: profileState
    })

    return {
      recommendations: result.recommendations,
      profile: finalizeQueryProfile(profileState)
    } as const
  }).pipe(
    Effect.provide(graph.layer),
    Effect.provide(GraphDb.GraphDialectSqlite.layer()),
    Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
  )

export const expectPhotoIds = (rows: ReadonlyArray<PhotoRecommendation>): ReadonlyArray<string> =>
  rows.map((row) => row.photoId)
