# Capability-Based Job Routing

The Effect cluster system now supports capability-based job routing, allowing you to submit jobs that can run on any runner with the required capabilities. This is perfect for scenarios where you need specific hardware or software capabilities but don't care which exact runner executes the job.

## Features

- **Capability Matching**: Jobs are routed to runners based on required capabilities
- **Type-Safe**: Full TypeScript support for job definitions and results
- **Error Handling**: Proper error types when no suitable runners are available
- **Flexible**: Jobs can require single or multiple capabilities

## Use Cases

- **Photo/Video Processing**: Route to runners with camera capabilities
- **ML/AI Workloads**: Route to runners with GPU capabilities  
- **File Operations**: Route to runners with storage/filesystem capabilities
- **Specialized Hardware**: Route to runners with specific sensors or devices

## Quick Example

```typescript
import { JobRunner, ShardingConfig } from "@effect/cluster"
import { Effect } from "effect"

// Configure runners with capabilities
const cameraRunnerConfig = ShardingConfig.layer({
  shardGroups: ["default", "camera", "image-processing"]
})

// Submit a job that needs camera capability
const result = yield* Effect.gen(function*() {
  const jobRunner = yield* JobRunner.JobRunner
  
  return yield* jobRunner.submitJob({
    capabilities: ["camera"],
    job: { location: "warehouse-entrance", resolution: "1080p" },
    handler: (job) => 
      Effect.succeed({
        success: true,
        imageUrl: `https://cdn.example.com/${job.location}.jpg`,
        processedBy: "camera-runner-1"
      })
  })
})
```

## Multiple Capabilities

Jobs can require multiple capabilities:

```typescript
// Job that needs both camera AND GPU for real-time processing
const result = yield* jobRunner.submitJob({
  capabilities: ["camera", "gpu"],
  job: { task: "real-time-object-detection" },
  handler: (job) => 
    Effect.succeed({
      detections: ["person", "car"],
      confidence: 0.95
    })
})
```

## Error Handling

When no runners have the required capabilities:

```typescript
import { JobRunner } from "@effect/cluster"

const result = yield* jobRunner.submitJob({
  capabilities: ["quantum-processor"], // No such runners exist
  job: { computation: "complex-calculation" },
  handler: (job) => Effect.succeed({ result: "done" })
}).pipe(
  Effect.catchTag("NoRunnersWithCapability", (error) => {
    console.log("Missing capabilities:", error.requiredCapabilities)
    return Effect.succeed({ fallback: true })
  })
)
```

## Runner Configuration

Configure runners with capabilities using `shardGroups`:

```typescript
// Camera-capable runner
const cameraRunner = ShardingConfig.layer({
  shardGroups: ["default", "camera", "image-processing"],
  runnerAddress: Option.some(RunnerAddress.make({ host: "camera-node-1", port: 8081 }))
})

// GPU-capable runner  
const gpuRunner = ShardingConfig.layer({
  shardGroups: ["default", "gpu", "ml-inference"],
  runnerAddress: Option.some(RunnerAddress.make({ host: "gpu-node-1", port: 8082 }))
})

// Multi-capability runner
const hybridRunner = ShardingConfig.layer({
  shardGroups: ["default", "camera", "gpu", "storage"],
  runnerAddress: Option.some(RunnerAddress.make({ host: "hybrid-node-1", port: 8083 }))
})
```

## Integration with Existing Cluster

The capability-based routing integrates seamlessly with the existing entity-based cluster system:

- Uses the same `shardGroups` configuration
- Works with the same layer system
- Compatible with existing runners and entities
- No breaking changes to existing code

For more examples, see [examples/CapabilityRouting.example.ts](./examples/CapabilityRouting.example.ts).