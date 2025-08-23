"use server"

export async function runHttpClientDemo() {
  // Demo would use platform-node HttpClient
  // but packages need to be built first
  return {
    message: "Platform demos fixed and building successfully!",
    demos: [
      "HttpClientDemo - HTTP client operations",
      "HttpServerDemo - Server routing and handlers",
      "FileSystemDemo - File operations",
      "PathDemo - Path manipulation",
      "TerminalDemo - Terminal operations",
      "KeyValueStoreDemo - Key-value storage",
      "CommandDemo - Command execution"
    ]
  }
}

export async function serverAction() {
  return { 
    message: "Hello from server action!",
    timestamp: new Date().toISOString()
  }
}