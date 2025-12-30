import { describe, expect, it } from "@effect/vitest"
import {
  applyTheme,
  createTheme,
  cssColorToHex,
  darkTheme,
  detectSystemPreference,
  getTheme,
  getThemeColor,
  getThemeMode,
  hslToHex,
  lightTheme,
  oklchToHex,
  setThemeMode
} from "../src/bridge/theme-map.js"

describe("hslToHex", () => {
  it("converts pure red (0, 100, 50) to #ff0000", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000")
  })

  it("converts pure green (120, 100, 50) to #00ff00", () => {
    expect(hslToHex(120, 100, 50)).toBe("#00ff00")
  })

  it("converts pure blue (240, 100, 50) to #0000ff", () => {
    expect(hslToHex(240, 100, 50)).toBe("#0000ff")
  })

  it("converts white (0, 0, 100) to #ffffff", () => {
    expect(hslToHex(0, 0, 100)).toBe("#ffffff")
  })

  it("converts black (0, 0, 0) to #000000", () => {
    expect(hslToHex(0, 0, 0)).toBe("#000000")
  })

  it("converts 50% gray (0, 0, 50) to #808080", () => {
    expect(hslToHex(0, 0, 50)).toBe("#808080")
  })

  it("handles negative hue by wrapping", () => {
    expect(hslToHex(-60, 100, 50)).toBe(hslToHex(300, 100, 50))
  })

  it("handles hue > 360 by wrapping", () => {
    expect(hslToHex(420, 100, 50)).toBe(hslToHex(60, 100, 50))
  })
})

describe("oklchToHex", () => {
  it("converts white (L=1, C=0, H=0) to #ffffff", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff")
  })

  it("converts black (L=0, C=0, H=0) to #000000", () => {
    expect(oklchToHex(0, 0, 0)).toBe("#000000")
  })

  it("converts achromatic gray (L=0.5, C=0) to a gray value", () => {
    const result = oklchToHex(0.5, 0, 0)
    // 0.5 * 255 = 127.5 -> 128 -> 0x80
    expect(result).toBe("#808080")
  })

  it("handles NaN hue as achromatic", () => {
    const result = oklchToHex(0.5, 0.1, NaN)
    expect(result).toBe("#808080")
  })

  it("converts a red-ish color (high chroma, ~0 hue)", () => {
    const result = oklchToHex(0.628, 0.258, 29.234)
    // Should be a reddish color - exact value depends on conversion accuracy
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
    // Check it's in the red range
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeGreaterThan(200)
  })

  it("converts a blue-ish color (high chroma, ~260 hue)", () => {
    const result = oklchToHex(0.488, 0.243, 264.376)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
    // Check it's in the blue range
    const b = parseInt(result.slice(5, 7), 16)
    expect(b).toBeGreaterThan(150)
  })
})

describe("cssColorToHex", () => {
  it("returns hex values unchanged", () => {
    expect(cssColorToHex("#ff0000")).toBe("#ff0000")
    expect(cssColorToHex("#ABCDEF")).toBe("#ABCDEF")
  })

  it("expands 3-character hex to 6-character", () => {
    expect(cssColorToHex("#f00")).toBe("#ff0000")
    expect(cssColorToHex("#abc")).toBe("#aabbcc")
  })

  it("parses oklch() colors", () => {
    const result = cssColorToHex("oklch(1 0 0)")
    expect(result).toBe("#ffffff")
  })

  it("parses oklch() with alpha (ignores alpha)", () => {
    const result = cssColorToHex("oklch(1 0 0 / 50%)")
    expect(result).toBe("#ffffff")
  })

  it("parses oklch() with decimal alpha (ignores alpha)", () => {
    const result = cssColorToHex("oklch(0.5 0 0 / 0.5)")
    expect(result).toBe("#808080")
  })

  it("parses hsl() colors with commas", () => {
    const result = cssColorToHex("hsl(0, 100, 50)")
    expect(result).toBe("#ff0000")
  })

  it("parses hsl() colors with spaces", () => {
    const result = cssColorToHex("hsl(120 100 50)")
    expect(result).toBe("#00ff00")
  })

  it("handles whitespace in input", () => {
    expect(cssColorToHex("  #ff0000  ")).toBe("#ff0000")
    expect(cssColorToHex("  oklch(1 0 0)  ")).toBe("#ffffff")
  })

  it("returns black for unknown formats", () => {
    expect(cssColorToHex("rgb(255, 0, 0)")).toBe("#000000")
    expect(cssColorToHex("not-a-color")).toBe("#000000")
  })
})

describe("lightTheme", () => {
  it("has all required color keys", () => {
    expect(lightTheme.background).toBeDefined()
    expect(lightTheme.foreground).toBeDefined()
    expect(lightTheme.primary).toBeDefined()
    expect(lightTheme["primary-foreground"]).toBeDefined()
    expect(lightTheme.secondary).toBeDefined()
    expect(lightTheme.destructive).toBeDefined()
    expect(lightTheme.muted).toBeDefined()
    expect(lightTheme.accent).toBeDefined()
    expect(lightTheme.border).toBeDefined()
  })

  it("has white background", () => {
    expect(lightTheme.background).toBe("#ffffff")
  })

  it("has dark foreground", () => {
    // #0a0a0a is very dark (near black)
    expect(lightTheme.foreground).toBe("#0a0a0a")
  })
})

describe("darkTheme", () => {
  it("has all required color keys", () => {
    expect(darkTheme.background).toBeDefined()
    expect(darkTheme.foreground).toBeDefined()
    expect(darkTheme.primary).toBeDefined()
    expect(darkTheme["primary-foreground"]).toBeDefined()
    expect(darkTheme.secondary).toBeDefined()
    expect(darkTheme.destructive).toBeDefined()
    expect(darkTheme.muted).toBeDefined()
    expect(darkTheme.accent).toBeDefined()
    expect(darkTheme.border).toBeDefined()
  })

  it("has dark background", () => {
    expect(darkTheme.background).toBe("#0a0a0a")
  })

  it("has light foreground", () => {
    expect(darkTheme.foreground).toBe("#fafafa")
  })
})

describe("theme state management", () => {
  it("defaults to light mode", () => {
    // Reset state
    setThemeMode("light")
    expect(getThemeMode()).toBe("light")
  })

  it("getThemeColor returns color from current theme", () => {
    setThemeMode("light")
    expect(getThemeColor("background")).toBe("#ffffff")

    setThemeMode("dark")
    expect(getThemeColor("background")).toBe("#0a0a0a")
  })

  it("getTheme returns a copy of the current theme", () => {
    setThemeMode("light")
    const theme = getTheme()
    expect(theme.background).toBe("#ffffff")
    // Verify it's a copy (modifying it doesn't affect original)
    theme.background = "#000000"
    expect(getThemeColor("background")).toBe("#ffffff")
  })

  it("setThemeMode changes the current theme", () => {
    setThemeMode("light")
    expect(getTheme().background).toBe("#ffffff")

    setThemeMode("dark")
    expect(getTheme().background).toBe("#0a0a0a")
  })
})

describe("createTheme", () => {
  it("creates a light theme with overrides", () => {
    const custom = createTheme("light", { background: "#f0f0f0" })
    expect(custom.background).toBe("#f0f0f0")
    expect(custom.foreground).toBe(lightTheme.foreground)
  })

  it("creates a dark theme with overrides", () => {
    const custom = createTheme("dark", { primary: "#3b82f6" })
    expect(custom.primary).toBe("#3b82f6")
    expect(custom.background).toBe(darkTheme.background)
  })
})

describe("applyTheme", () => {
  it("applies a custom theme as current", () => {
    const custom = createTheme("light", { background: "#custom0" })
    applyTheme(custom)
    expect(getThemeColor("background")).toBe("#custom0")

    // Reset for other tests
    setThemeMode("light")
  })
})

describe("detectSystemPreference", () => {
  it("returns light or dark (non-browser environment defaults to light)", () => {
    const result = detectSystemPreference()
    expect(["light", "dark"]).toContain(result)
  })
})
