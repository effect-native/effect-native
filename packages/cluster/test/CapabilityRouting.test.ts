import {
  JobRunner,
  MessageStorage,
  Runners,
  Sharding,
  ShardingConfig,
  ShardManager,
  ShardStorage
} from "@effect/cluster"
import { describe, expect, it } from "@effect/vitest"
import {
  Effect,
  Layer,
  Schema,
  TestClock
} from "effect"

/**
 * Test schema for capability-based jobs
 */
export class PhotoCaptureJob extends Schema.Class<PhotoCaptureJob>("PhotoCaptureJob")({
  location: Schema.String,
  resolution: Schema.String,
  requestId: Schema.String
}) {}

export class ProcessingResult extends Schema.Class<ProcessingResult>("ProcessingResult")({
  success: Schema.Boolean,
  message: Schema.String,
  processedBy: Schema.String
}) {}

describe.concurrent("Capability-based Job Routing", () => {
  it.scoped("should route job to any runner with camera capability", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)

      // Submit a photo capture job that should be routed to any runner with "camera" capability
      const job = new PhotoCaptureJob({
        location: "parking-lot",
        resolution: "1080p", 
        requestId: "req-123"
      })

      const jobRunner = yield* JobRunner.JobRunner
      const result = yield* jobRunner.submitJob({
        capabilities: ["camera"],
        job: job,
        handler: (job: PhotoCaptureJob) => 
          Effect.succeed(new ProcessingResult({
            success: true,
            message: `Captured photo at ${job.location}`,
            processedBy: "camera-runner-1"
          }))
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain("parking-lot")
      expect(result.processedBy).toContain("camera-runner")
    }).pipe(Effect.provide(TestCapabilityRouting))
  )

  it.scoped("should route job to any runner with GPU capability", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)

      // Submit a GPU-intensive job
      const job = {
        modelPath: "/models/llama-7b",
        prompt: "Hello world",
        requestId: "gpu-req-456"
      }

      const jobRunner = yield* JobRunner.JobRunner
      const result = yield* jobRunner.submitJob({
        capabilities: ["gpu"],
        job: job,
        handler: (job: any) =>
          Effect.succeed({
            response: "Hello! How can I help you?",
            processedBy: "gpu-runner-2",
            tokens: 42
          })
      })

      expect(result.response).toBe("Hello! How can I help you?")
      expect(result.processedBy).toContain("gpu-runner")
      expect(result.tokens).toBe(42)
    }).pipe(Effect.provide(TestCapabilityRouting))
  )

  it.scoped("should fail when no runners have required capability", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)

      const job = {
        task: "quantum-computing",
        requestId: "quantum-req-789"
      }

      const jobRunner = yield* JobRunner.JobRunner
      const error = yield* jobRunner.submitJob({
        capabilities: ["quantum-processor"], // No runners have this capability
        job: job,
        handler: (job: any) => Effect.succeed({ result: "computed" })
      }).pipe(Effect.flip)

      expect(error._tag).toBe("NoRunnersWithCapability")
      expect(error.requiredCapabilities).toEqual(["quantum-processor"])
    }).pipe(Effect.provide(TestCapabilityRouting))
  )

  it.scoped("should handle multiple capability requirements", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)

      // Job that requires both "camera" AND "gpu" capabilities
      const job = {
        task: "real-time-object-detection",
        camera: "front-facing",
        model: "yolo-v8",
        requestId: "multi-cap-123"
      }

      const jobRunner = yield* JobRunner.JobRunner
      const result = yield* jobRunner.submitJob({
        capabilities: ["camera", "gpu"], // Both capabilities required
        job: job,
        handler: (job: any) =>
          Effect.succeed({
            success: true,
            detections: ["person", "car", "bicycle"],
            processedBy: "camera-gpu-runner",
            confidence: 0.95
          })
      })

      expect(result.success).toBe(true)
      expect(result.detections).toEqual(["person", "car", "bicycle"])
      expect(result.processedBy).toContain("camera-gpu-runner")
    }).pipe(Effect.provide(TestCapabilityRouting))
  )

  it.scoped("should work with single capability from multiple available", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)

      // Job that only needs "gpu" but runner has multiple capabilities
      const job = {
        computation: "matrix-multiplication",
        size: "1024x1024",
        requestId: "single-from-multi-456"
      }

      const jobRunner = yield* JobRunner.JobRunner
      const result = yield* jobRunner.submitJob({
        capabilities: ["gpu"], // Only needs GPU
        job: job,
        handler: (job: any) =>
          Effect.succeed({
            result: "computed",
            flops: 1000000,
            processedBy: "multi-capability-runner"
          })
      })

      expect(result.result).toBe("computed")
      expect(result.flops).toBe(1000000)
    }).pipe(Effect.provide(TestCapabilityRouting))
  )
})

// Test configuration layers
const TestShardingConfig = ShardingConfig.layer({
  entityMailboxCapacity: 10,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 5000,
  sendRetryInterval: 100,
  shardGroups: ["default", "camera", "gpu"] // Multiple capability groups
})

const TestCapabilityRouting = JobRunner.layer.pipe(
  Layer.provide(TestShardingConfig),
  Layer.provideMerge(Sharding.layer.pipe(
    Layer.provide(ShardManager.layerClientLocal),
    Layer.provide(ShardStorage.layerMemory),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(TestShardingConfig)
  ))
)