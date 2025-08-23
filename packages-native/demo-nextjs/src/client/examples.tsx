"use client"
import { serverAction } from "@/server/examples"
// TODO: Fix platform-demo package exports for Next.js compatibility
// import * as PlatformDemo from "@effect-native/platform-demo"
// console.log("PlatformDemo", PlatformDemo)

export function ClientComponent() {
  return (
    <div>
      <h1>Platform Demo</h1>
      <p>Check the console for logs from the PlatformDemo module.</p>
      <button onClick={() => { serverAction().then(console.log, console.warn) }}>call server action</button>
    </div>
  )
}
