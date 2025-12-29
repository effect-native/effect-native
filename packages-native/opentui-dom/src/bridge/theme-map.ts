/**
 * Theme Map - shadcn/Tailwind CSS variable theme to TUI hex colors
 *
 * Translates shadcn's CSS variable theme system to TUI-compatible hex colors.
 * shadcn uses oklch() color space in CSS variables, which we convert to hex.
 *
 * ## How shadcn CSS vars map to TUI:
 *
 * shadcn defines semantic color tokens as CSS variables using oklch():
 * - `--background` -> page background
 * - `--foreground` -> default text color
 * - `--primary` -> primary action color
 * - `--primary-foreground` -> text on primary
 * - `--secondary` -> secondary surfaces
 * - `--destructive` -> error/danger states
 * - `--muted` -> subtle backgrounds
 * - `--accent` -> highlighted elements
 * - `--border` -> border color
 *
 * TUI uses hex colors (#RRGGBB), so we convert oklch -> sRGB -> hex.
 *
 * @module bridge/theme-map
 */

/** Standard shadcn theme color names */
export type ThemeColorName =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "border"
  | "input"
  | "ring"

/** Theme map is a record of color names to hex strings */
export type ThemeMap = Record<ThemeColorName, string>

/** Theme mode preference */
export type ThemeMode = "light" | "dark" | "system"

/**
 * Convert HSL values to hex color string.
 * Input: h in degrees [0,360], s and l as percentages [0,100]
 */
export function hslToHex(h: number, s: number, l: number): string {
  // Normalize inputs
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0,
    g = 0,
    b = 0

  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0")

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Convert oklch values to hex color string.
 * Input: L (lightness) [0,1], C (chroma) [0,~0.4], H (hue) [0,360]
 *
 * oklch is a perceptually uniform color space used by modern CSS.
 * We convert through Lab -> XYZ -> sRGB -> hex.
 */
export function oklchToHex(l: number, c: number, h: number): string {
  // Handle achromatic (no chroma) case
  if (c === 0 || isNaN(h)) {
    // Achromatic - just use lightness
    const gray = Math.round(l * 255)
    const hex = gray.toString(16).padStart(2, "0")
    return `#${hex}${hex}${hex}`
  }

  // Convert oklch to oklab
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  // Convert oklab to linear sRGB
  // Using the oklab to linear sRGB matrix
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b

  const l3 = l_ * l_ * l_
  const m3 = m_ * m_ * m_
  const s3 = s_ * s_ * s_

  // Linear sRGB
  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  let bVal = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3

  // Gamma correction (linear sRGB to sRGB)
  const gammaCorrect = (x: number) => {
    if (x <= 0.0031308) {
      return 12.92 * x
    }
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055
  }

  r = gammaCorrect(r)
  g = gammaCorrect(g)
  bVal = gammaCorrect(bVal)

  // Clamp and convert to hex
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(1, n))
    return Math.round(clamped * 255)
      .toString(16)
      .padStart(2, "0")
  }

  return `#${toHex(r)}${toHex(g)}${toHex(bVal)}`
}

/**
 * Parse CSS color value and return hex.
 * Supports: oklch(), hsl(), hex, and named colors.
 */
export function cssColorToHex(cssValue: string): string {
  const trimmed = cssValue.trim()

  // Already hex
  if (trimmed.startsWith("#")) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed
  }

  // oklch(L C H) - L is 0-1, C is typically 0-0.4, H is 0-360
  const oklchMatch = trimmed.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/
  )
  if (oklchMatch) {
    const l = parseFloat(oklchMatch[1]!)
    const c = parseFloat(oklchMatch[2]!)
    const h = parseFloat(oklchMatch[3]!)
    return oklchToHex(l, c, h)
  }

  // oklch with alpha: oklch(L C H / alpha)
  const oklchAlphaMatch = trimmed.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\/\s*[\d.]+%?\s*\)/
  )
  if (oklchAlphaMatch) {
    const l = parseFloat(oklchAlphaMatch[1]!)
    const c = parseFloat(oklchAlphaMatch[2]!)
    const h = parseFloat(oklchAlphaMatch[3]!)
    return oklchToHex(l, c, h)
  }

  // hsl(H S% L%) or hsl(H, S%, L%)
  const hslMatch = trimmed.match(
    /hsl\(\s*([\d.]+)[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?\s*\)/
  )
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]!)
    const s = parseFloat(hslMatch[2]!)
    const l = parseFloat(hslMatch[3]!)
    return hslToHex(h, s, l)
  }

  // Fallback for unknown formats
  return "#000000"
}

/**
 * Light mode theme map - shadcn default light theme.
 * Values derived from shadcn's oklch CSS variables.
 */
export const lightTheme: ThemeMap = {
  background: "#ffffff", // oklch(1 0 0)
  foreground: "#0a0a0a", // oklch(0.145 0 0)
  card: "#ffffff", // oklch(1 0 0)
  "card-foreground": "#0a0a0a", // oklch(0.145 0 0)
  popover: "#ffffff", // oklch(1 0 0)
  "popover-foreground": "#0a0a0a", // oklch(0.145 0 0)
  primary: "#171717", // oklch(0.205 0 0)
  "primary-foreground": "#fafafa", // oklch(0.985 0 0)
  secondary: "#f5f5f5", // oklch(0.97 0 0)
  "secondary-foreground": "#171717", // oklch(0.205 0 0)
  muted: "#f5f5f5", // oklch(0.97 0 0)
  "muted-foreground": "#737373", // oklch(0.556 0 0)
  accent: "#f5f5f5", // oklch(0.97 0 0)
  "accent-foreground": "#171717", // oklch(0.205 0 0)
  destructive: "#dc2626", // oklch(0.577 0.245 27.325)
  border: "#e5e5e5", // oklch(0.922 0 0)
  input: "#e5e5e5", // oklch(0.922 0 0)
  ring: "#a3a3a3", // oklch(0.708 0 0)
}

/**
 * Dark mode theme map - shadcn default dark theme.
 * Values derived from shadcn's oklch CSS variables.
 */
export const darkTheme: ThemeMap = {
  background: "#0a0a0a", // oklch(0.145 0 0)
  foreground: "#fafafa", // oklch(0.985 0 0)
  card: "#171717", // oklch(0.205 0 0)
  "card-foreground": "#fafafa", // oklch(0.985 0 0)
  popover: "#171717", // oklch(0.205 0 0)
  "popover-foreground": "#fafafa", // oklch(0.985 0 0)
  primary: "#e5e5e5", // oklch(0.922 0 0)
  "primary-foreground": "#171717", // oklch(0.205 0 0)
  secondary: "#262626", // oklch(0.269 0 0)
  "secondary-foreground": "#fafafa", // oklch(0.985 0 0)
  muted: "#262626", // oklch(0.269 0 0)
  "muted-foreground": "#a3a3a3", // oklch(0.708 0 0)
  accent: "#262626", // oklch(0.269 0 0)
  "accent-foreground": "#fafafa", // oklch(0.985 0 0)
  destructive: "#ef4444", // oklch(0.704 0.191 22.216)
  border: "#262626", // oklch(1 0 0 / 10%) approximated
  input: "#2e2e2e", // oklch(1 0 0 / 15%) approximated
  ring: "#737373", // oklch(0.556 0 0)
}

/** Current active theme (mutable state for runtime) */
let currentTheme: ThemeMap = lightTheme
let currentMode: ThemeMode = "light"

/**
 * Get a specific theme color by name.
 * Returns the hex color string for the current theme.
 */
export function getThemeColor(name: ThemeColorName): string {
  return currentTheme[name] ?? "#000000"
}

/**
 * Get the entire current theme map.
 */
export function getTheme(): ThemeMap {
  return { ...currentTheme }
}

/**
 * Get the current theme mode.
 */
export function getThemeMode(): ThemeMode {
  return currentMode
}

/**
 * Set the theme mode and update the current theme.
 * "system" preference detection works in browser environments.
 */
export function setThemeMode(mode: ThemeMode): void {
  currentMode = mode

  if (mode === "light") {
    currentTheme = lightTheme
  } else if (mode === "dark") {
    currentTheme = darkTheme
  } else {
    // "system" - detect preference
    currentTheme = detectSystemPreference() === "dark" ? darkTheme : lightTheme
  }
}

/**
 * Detect system color scheme preference.
 * Returns "dark" if system prefers dark mode, "light" otherwise.
 *
 * Works in environments with window.matchMedia (browsers).
 * Falls back to "light" in non-browser environments.
 */
export function detectSystemPreference(): "light" | "dark" {
  if (
    typeof globalThis !== "undefined" &&
    "matchMedia" in globalThis &&
    typeof (globalThis as unknown as { matchMedia: unknown }).matchMedia ===
      "function"
  ) {
    const mq = (
      globalThis as unknown as {
        matchMedia: (q: string) => { matches: boolean }
      }
    ).matchMedia("(prefers-color-scheme: dark)")
    return mq.matches ? "dark" : "light"
  }
  // Default to light in non-browser environments
  return "light"
}

/**
 * Create a custom theme map by merging overrides with a base theme.
 */
export function createTheme(
  base: "light" | "dark",
  overrides: Partial<ThemeMap>
): ThemeMap {
  const baseTheme = base === "dark" ? darkTheme : lightTheme
  return { ...baseTheme, ...overrides }
}

/**
 * Apply a custom theme as the current theme.
 */
export function applyTheme(theme: ThemeMap): void {
  currentTheme = { ...theme }
}
