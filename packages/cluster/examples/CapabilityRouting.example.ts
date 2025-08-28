/**
 * Example demonstrating capability-based job routing with the Effect cluster system
 * 
 * This example shows how to submit jobs that can run on any runner with specific capabilities,
 * such as camera, GPU, or storage capabilities.
 */

import { JobRunner, ShardingConfig } from "@effect/cluster"
import { Effect, Layer, Schema } from "effect"

// Define job schemas
export class PhotoCaptureJob extends Schema.Class<PhotoCaptureJob>("PhotoCaptureJob")({
  location: Schema.String,
  resolution: Schema.String,
  timestamp: Schema.String
}) {}

export class MLInferenceJob extends Schema.Class<MLInferenceJob>("MLInferenceJob")({
  modelPath: Schema.String,
  inputData: Schema.String,
  maxTokens: Schema.Number
}) {}

export class FileProcessingJob extends Schema.Class<FileProcessingJob>("FileProcessingJob")({
  filePath: Schema.String,
  operation: Schema.String,
  outputPath: Schema.String
}) {}

// Define result schemas
export class PhotoResult extends Schema.Class<PhotoResult>("PhotoResult")({
  success: Schema.Boolean,
  imageUrl: Schema.String,
  processedBy: Schema.String,
  metadata: Schema.Struct({
    captureTime: Schema.String,
    fileSize: Schema.Number
  })
}) {}

export class MLResult extends Schema.Class<MLResult>("MLResult")({
  response: Schema.String,
  tokensUsed: Schema.Number,
  processedBy: Schema.String,
  inferenceTime: Schema.Number
}) {}

export class FileResult extends Schema.Class<FileResult>("FileResult")({
  success: Schema.Boolean,
  outputPath: Schema.String,
  processedBy: Schema.String,
  processingTime: Schema.Number
}) {}

/**
 * Example: Submit a photo capture job to any runner with camera capability
 */
export const submitPhotoCaptureJob = (location: string, resolution: string) =>
  Effect.gen(function*() {
    const jobRunner = yield* JobRunner.JobRunner
    
    const result = yield* jobRunner.submitJob({
      capabilities: ["camera"],
      job: new PhotoCaptureJob({
        location,
        resolution,
        timestamp: new Date().toISOString()
      }),
      handler: (job) =>
        Effect.succeed(new PhotoResult({
          success: true,
          imageUrl: `https://cdn.example.com/photos/${job.location}-${Date.now()}.jpg`,
          processedBy: "camera-runner-1",
          metadata: {
            captureTime: job.timestamp,
            fileSize: 2048576 // 2MB
          }
        }))
    })

    return result
  })

/**
 * Example: Submit an ML inference job to any runner with GPU capability
 */
export const submitMLInferenceJob = (modelPath: string, prompt: string) =>
  Effect.gen(function*() {
    const jobRunner = yield* JobRunner.JobRunner
    
    const result = yield* jobRunner.submitJob({
      capabilities: ["gpu", "ml-inference"],
      job: new MLInferenceJob({
        modelPath,
        inputData: prompt,
        maxTokens: 100
      }),
      handler: (job) =>
        Effect.succeed(new MLResult({
          response: `Response to: ${job.inputData}`,
          tokensUsed: 42,
          processedBy: "gpu-runner-2",
          inferenceTime: 1500 // ms
        }))
    })

    return result
  })

/**
 * Example: Submit a file processing job to any runner with storage capability
 */
export const submitFileProcessingJob = (filePath: string, operation: string) =>
  Effect.gen(function*() {
    const jobRunner = yield* JobRunner.JobRunner
    
    const result = yield* jobRunner.submitJob({
      capabilities: ["storage", "file-processing"],
      job: new FileProcessingJob({
        filePath,
        operation,
        outputPath: `/processed/${filePath.split('/').pop()}`
      }),
      handler: (job) =>
        Effect.succeed(new FileResult({
          success: true,
          outputPath: job.outputPath,
          processedBy: "storage-runner-3",
          processingTime: 2000 // ms
        }))
    })

    return result
  })

/**
 * Example: Comprehensive job submission with error handling
 */
export const runJobExample = Effect.gen(function*() {
  console.log("Starting capability-based job routing example...")
  
  // Submit different types of jobs
  try {
    const photoResult = yield* submitPhotoCaptureJob("warehouse-entrance", "1080p")
    console.log("Photo capture successful:", photoResult)
    
    const mlResult = yield* submitMLInferenceJob("/models/llama-7b", "Hello, how are you?")
    console.log("ML inference successful:", mlResult)
    
    const fileResult = yield* submitFileProcessingJob("/uploads/document.pdf", "compress")
    console.log("File processing successful:", fileResult)
    
  } catch (error) {
    if (error._tag === "NoRunnersWithCapability") {
      console.error("No runners available with required capabilities:", error.requiredCapabilities)
    } else {
      console.error("Job execution failed:", error)
    }
  }
})

/**
 * Example configuration for runners with different capabilities
 */
export const CameraRunnerConfig = ShardingConfig.layer({
  shardGroups: ["default", "camera", "image-processing"],
  // ... other config
})

export const GPURunnerConfig = ShardingConfig.layer({
  shardGroups: ["default", "gpu", "ml-inference"],
  // ... other config  
})

export const StorageRunnerConfig = ShardingConfig.layer({
  shardGroups: ["default", "storage", "file-processing"],
  // ... other config
})