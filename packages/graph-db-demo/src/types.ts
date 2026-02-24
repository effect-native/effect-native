import * as Schema from "effect/Schema"

export const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String
})

export type User = Schema.Schema.Type<typeof User>

export const Photo = Schema.Struct({
  id: Schema.String,
  ownerId: Schema.String,
  caption: Schema.String
})

export type Photo = Schema.Schema.Type<typeof Photo>

export const Post = Schema.Struct({
  id: Schema.String,
  authorId: Schema.String,
  text: Schema.String
})

export type Post = Schema.Schema.Type<typeof Post>

export const SocialEdgeType = {
  Friend: "friend",
  LikedPhoto: "liked_photo",
  CommentedPost: "commented_post"
} as const

export type SocialEdgeType = (typeof SocialEdgeType)[keyof typeof SocialEdgeType]

export interface SeedShape {
  readonly users: number
  readonly photos: number
  readonly posts: number
  readonly friendEdges: number
  readonly likedPhotoEdges: number
  readonly commentedPostEdges: number
}

export interface SeedMetadata {
  readonly seed: number
  readonly shape: SeedShape
}

export interface QueryInput {
  readonly userId: string
  readonly limit: number
}

export interface PhotoRecommendation {
  readonly photoId: string
  readonly photo: Photo
  readonly likedByFriendOfFriendCount: number
  readonly sampleFriendOfFriendIds: ReadonlyArray<string>
}

export interface QueryProfile {
  readonly edgeOutCalls: number
  readonly edgeInCalls: number
  readonly nodeGetCalls: number
  readonly rowsTraversed: number
  readonly elapsedMs: number
  readonly helperCallCounts: Readonly<Record<string, number>>
  readonly repeatedPatterns: Readonly<Record<string, number>>
}

export interface AffordanceFinding {
  readonly painPoint: string
  readonly repeatedPattern: string
  readonly proposedHelper: string
  readonly proposedGraphDbExtraction: string
}

export interface DemoReport {
  readonly query: QueryInput
  readonly seed: SeedMetadata
  readonly topPhotos: ReadonlyArray<PhotoRecommendation>
  readonly profile: QueryProfile
  readonly affordanceFindings: ReadonlyArray<AffordanceFinding>
}
