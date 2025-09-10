// Ambient types for test authoring convenience
declare function describe(name: string, fn: () => void): void
declare namespace describe {
  const only: typeof describe
  const skip: typeof describe
}

declare function it(name: string, fn: () => void, options?: unknown): void
declare namespace it {
  const only: typeof it
  const skip: typeof it
  // Adapters may extend this in setup/preload to improve ergonomics
  function effect(name: string, effect: unknown, options?: unknown): void
}

declare const expect: any
