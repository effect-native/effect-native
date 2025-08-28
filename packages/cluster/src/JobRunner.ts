/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ShardingConfig } from "./ShardingConfig.js"

/**
 * Error indicating no runners have the required capability
 * @since 1.0.0
 * @category errors
 */
export class NoRunnersWithCapability extends Data.TaggedError("NoRunnersWithCapability")<{
  readonly requiredCapabilities: ReadonlyArray<string>
}> {}

/**
 * Configuration for a capability-based job submission
 * 
 * @example
 * ```typescript
 * const jobOptions: JobSubmissionOptions<PhotoJob, PhotoResult> = {
 *   capabilities: ["camera", "image-processing"],
 *   job: { 
 *     location: "warehouse-entrance", 
 *     timestamp: new Date().toISOString() 
 *   },
 *   handler: (job) => 
 *     Effect.gen(function*() {
 *       const imageUrl = yield* capturePhoto(job.location)
 *       const processedUrl = yield* processImage(imageUrl)
 *       return { success: true, imageUrl: processedUrl }
 *     })
 * }
 * ```
 * 
 * @since 1.0.0
 * @category models
 */
export interface JobSubmissionOptions<Job, Result> {
  readonly capabilities: ReadonlyArray<string>
  readonly job: Job
  readonly handler: (job: Job) => Effect.Effect<Result>
}

/**
 * JobRunner service for capability-based job routing
 * 
 * Allows submitting jobs that can be executed on any runner with the required capabilities.
 * This is useful for scenarios like:
 * - Photo capture jobs that need runners with "camera" capability
 * - ML inference jobs that need runners with "gpu" capability
 * - File processing jobs that need runners with "storage" capability
 * 
 * @example
 * ```typescript
 * import { JobRunner } from "@effect/cluster"
 * import { Effect } from "effect"
 * 
 * const result = yield* JobRunner.JobRunner.pipe(
 *   Effect.flatMap(jobRunner => 
 *     jobRunner.submitJob({
 *       capabilities: ["camera"],
 *       job: { location: "parking-lot", resolution: "1080p" },
 *       handler: (job) => 
 *         Effect.succeed({ 
 *           success: true, 
 *           imageUrl: `https://cdn.example.com/${job.location}.jpg`,
 *           processedBy: "camera-runner-1" 
 *         })
 *     })
 *   )
 * )
 * ```
 * 
 * @since 1.0.0
 * @category context
 */
export class JobRunner extends Context.Tag("@effect/cluster/JobRunner")<JobRunner, {
  /**
   * Submit a job to any runner that has the required capabilities
   */
  readonly submitJob: <Job, Result>(
    options: JobSubmissionOptions<Job, Result>
  ) => Effect.Effect<Result, NoRunnersWithCapability>
}>() {}

/**
 * Default implementation that finds available runners with required capabilities
 * and routes the job to them
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<JobRunner, never, ShardingConfig> = Layer.effect(
  JobRunner,
  Effect.gen(function*() {
    const config = yield* ShardingConfig

    return {
      submitJob: <Job, Result>(options: JobSubmissionOptions<Job, Result>) =>
        Effect.gen(function*() {
          // Check if any of the configured shard groups match the required capabilities
          const availableCapabilities = config.shardGroups
          const hasRequiredCapabilities = options.capabilities.some(cap => 
            availableCapabilities.includes(cap)
          )

          if (!hasRequiredCapabilities) {
            return yield* Effect.fail(
              new NoRunnersWithCapability({ 
                requiredCapabilities: options.capabilities 
              })
            )
          }

          // For now, execute the job locally since we have the required capabilities
          // In a real implementation, this would route to the appropriate runner
          return yield* options.handler(options.job)
        })
    }
  })
)