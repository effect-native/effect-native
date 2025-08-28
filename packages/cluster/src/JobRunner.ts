/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { RunnerAddress } from "./RunnerAddress.js"
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