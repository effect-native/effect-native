"use server"

export async function runHttpClientDemo() {
  // Actually run the HttpClient demo on the server using Node layers
  const [{ Effect }, HttpClientDemo, NodeHttpClient] = await Promise.all([
    import("effect/Effect"),
    import("@effect-native/platform-demo/HttpClientDemo"),
    import("@effect/platform-node/NodeHttpClient")
  ])

  const result = await Effect.provide(
    HttpClientDemo.basicRequests,
    NodeHttpClient.layer
  ).pipe(Effect.runPromise)

  return {
    message: "Ran HttpClientDemo.basicRequests on the server",
    result
  }
}

export async function serverAction() {
  return { 
    message: "Hello from server action!",
    timestamp: new Date().toISOString()
  }
}
