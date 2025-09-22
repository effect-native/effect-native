import { describe, expect, it } from "@effect/vitest"

import * as MiniDom from "@effect-native/minidom"

import * as Events from "@effect-native/minidom/events"
import * as Host from "@effect-native/minidom/host"

describe("Package scaffolding (FR1.2 / FR1.13)", () => {
  it("exposes core module structure", () => {
    expect(MiniDom.AttributeBag).toBeDefined()
    expect(MiniDom.Composite).toBeDefined()
    expect(MiniDom.Schema).toBeDefined()
  })

  it("exposes events and host entry points", () => {
    expect(Events).toBeDefined()
    expect(Host).toBeDefined()
  })
})
