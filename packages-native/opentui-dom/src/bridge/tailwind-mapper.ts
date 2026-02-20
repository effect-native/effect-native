/**
 * Tailwind to OpenTUI Style Mapper
 *
 * Maps Tailwind CSS utility classes to OpenTUI style properties.
 * Focuses on the 80/20 - most commonly used classes.
 *
 * @module bridge/tailwind-mapper
 */

export type ColorInput = string

export interface TuiStyleProps {
  // Layout
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse"
  flexWrap?: "no-wrap" | "wrap" | "wrap-reverse"
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number | "auto"

  // Alignment
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly"
  alignItems?: "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline"
  alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch"

  // Gap
  gap?: number | `${number}%`
  rowGap?: number | `${number}%`
  columnGap?: number | `${number}%`

  // Spacing
  padding?: number | `${number}%`
  paddingTop?: number | `${number}%`
  paddingRight?: number | `${number}%`
  paddingBottom?: number | `${number}%`
  paddingLeft?: number | `${number}%`
  margin?: number | "auto" | `${number}%`
  marginTop?: number | "auto" | `${number}%`
  marginRight?: number | "auto" | `${number}%`
  marginBottom?: number | "auto" | `${number}%`
  marginLeft?: number | "auto" | `${number}%`

  // Sizing
  width?: number | "auto" | `${number}%`
  height?: number | "auto" | `${number}%`
  minWidth?: number | "auto" | `${number}%`
  minHeight?: number | "auto" | `${number}%`
  maxWidth?: number | "auto" | `${number}%`
  maxHeight?: number | "auto" | `${number}%`

  // Position
  position?: "static" | "relative" | "absolute"
  top?: number | "auto" | `${number}%`
  right?: number | "auto" | `${number}%`
  bottom?: number | "auto" | `${number}%`
  left?: number | "auto" | `${number}%`

  // Colors
  fg?: ColorInput
  bg?: ColorInput
  backgroundColor?: ColorInput
  borderColor?: ColorInput

  // Border
  border?: boolean | Array<"top" | "right" | "bottom" | "left">
  borderStyle?: "single" | "double" | "rounded" | "heavy"

  // Typography
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  dim?: boolean

  // Visibility
  visible?: boolean
  opacity?: number
  overflow?: "visible" | "hidden" | "scroll"

  // Z-index
  zIndex?: number
}

/**
 * Tailwind spacing scale to TUI cell units
 * Tailwind uses 4px base, TUI uses ~16px per cell
 */
const spacingScale: Record<string, number> = {
  "0": 0,
  "0.5": 0,
  "1": 0,
  "1.5": 0,
  "2": 1,
  "2.5": 1,
  "3": 1,
  "3.5": 1,
  "4": 1,
  "5": 1,
  "6": 2,
  "7": 2,
  "8": 2,
  "9": 2,
  "10": 3,
  "11": 3,
  "12": 3,
  "14": 4,
  "16": 4,
  "20": 5,
  "24": 6,
  "28": 7,
  "32": 8,
  "36": 9,
  "40": 10,
  "44": 11,
  "48": 12,
  "52": 13,
  "56": 14,
  "60": 15,
  "64": 16,
  "72": 18,
  "80": 20,
  "96": 24,
  px: 0
}

/** Color palette - Tailwind colors to hex */
const colorPalette: Record<string, Record<string, string>> = {
  slate: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
    950: "#020617"
  },
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
    950: "#030712"
  },
  zinc: {
    50: "#FAFAFA",
    100: "#F4F4F5",
    200: "#E4E4E7",
    300: "#D4D4D8",
    400: "#A1A1AA",
    500: "#71717A",
    600: "#52525B",
    700: "#3F3F46",
    800: "#27272A",
    900: "#18181B",
    950: "#09090B"
  },
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
    950: "#450A0A"
  },
  orange: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316",
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
    950: "#431407"
  },
  yellow: {
    50: "#FEFCE8",
    100: "#FEF9C3",
    200: "#FEF08A",
    300: "#FDE047",
    400: "#FACC15",
    500: "#EAB308",
    600: "#CA8A04",
    700: "#A16207",
    800: "#854D0E",
    900: "#713F12",
    950: "#422006"
  },
  green: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
    950: "#052E16"
  },
  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
    950: "#172554"
  },
  purple: {
    50: "#FAF5FF",
    100: "#F3E8FF",
    200: "#E9D5FF",
    300: "#D8B4FE",
    400: "#C084FC",
    500: "#A855F7",
    600: "#9333EA",
    700: "#7E22CE",
    800: "#6B21A8",
    900: "#581C87",
    950: "#3B0764"
  },
  pink: {
    50: "#FDF2F8",
    100: "#FCE7F3",
    200: "#FBCFE8",
    300: "#F9A8D4",
    400: "#F472B6",
    500: "#EC4899",
    600: "#DB2777",
    700: "#BE185D",
    800: "#9D174D",
    900: "#831843",
    950: "#500724"
  },
  cyan: {
    50: "#ECFEFF",
    100: "#CFFAFE",
    200: "#A5F3FC",
    300: "#67E8F9",
    400: "#22D3EE",
    500: "#06B6D4",
    600: "#0891B2",
    700: "#0E7490",
    800: "#155E75",
    900: "#164E63",
    950: "#083344"
  }
}

/** Simple color names */
const simpleColors: Record<string, string> = {
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
  inherit: "inherit",
  current: "currentColor"
}

/** Fraction to percent mapping */
const fractionToPercent: Record<string, string> = {
  full: "100%",
  "1/2": "50%",
  "1/3": "33%",
  "2/3": "67%",
  "1/4": "25%",
  "2/4": "50%",
  "3/4": "75%",
  "1/5": "20%",
  "2/5": "40%",
  "3/5": "60%",
  "4/5": "80%",
  "1/6": "17%",
  "2/6": "33%",
  "3/6": "50%",
  "4/6": "67%",
  "5/6": "83%",
  "1/12": "8%",
  "2/12": "17%",
  "3/12": "25%",
  "4/12": "33%",
  "5/12": "42%",
  "6/12": "50%",
  "7/12": "58%",
  "8/12": "67%",
  "9/12": "75%",
  "10/12": "83%",
  "11/12": "92%",
  screen: "100%",
  min: "auto",
  max: "auto",
  fit: "auto"
}

function parseSpacing(value: string): number | undefined {
  return spacingScale[value]
}

function parseColor(colorClass: string): string | undefined {
  // Simple colors
  if (simpleColors[colorClass]) {
    return simpleColors[colorClass]
  }

  // Parse color-shade format (e.g., "blue-500")
  const match = colorClass.match(/^(\w+)-(\d+)$/)
  if (match) {
    const [, name, shade] = match
    if (name && shade) {
      const palette = colorPalette[name]
      if (palette && palette[shade]) {
        return palette[shade]
      }
    }
  }

  // Named terminal colors
  const terminalColors = ["red", "green", "blue", "yellow", "cyan", "magenta", "gray", "grey"]
  if (terminalColors.includes(colorClass)) {
    return colorClass
  }

  return undefined
}

function parseSizeValue(value: string): number | "auto" | `${number}%` | undefined {
  if (value === "auto") return "auto"
  if (fractionToPercent[value]) return fractionToPercent[value] as `${number}%`

  const num = parseFloat(value)
  if (!isNaN(num)) {
    // For TUI, map pixel-based sizes to cells
    // This is approximate - assumes 1 cell = 4 tailwind units
    return Math.round(num / 4)
  }
  return undefined
}

type ClassMapper = (value: string) => Partial<TuiStyleProps> | undefined

const classMappers: Record<string, ClassMapper | Partial<TuiStyleProps>> = {
  // Flex direction
  flex: {}, // OpenTUI is flex by default
  "flex-row": { flexDirection: "row" },
  "flex-col": { flexDirection: "column" },
  "flex-row-reverse": { flexDirection: "row-reverse" },
  "flex-col-reverse": { flexDirection: "column-reverse" },

  // Flex wrap
  "flex-wrap": { flexWrap: "wrap" },
  "flex-nowrap": { flexWrap: "no-wrap" },
  "flex-wrap-reverse": { flexWrap: "wrap-reverse" },

  // Flex grow/shrink
  "flex-1": { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  "flex-auto": { flexGrow: 1, flexShrink: 1, flexBasis: "auto" },
  "flex-initial": { flexGrow: 0, flexShrink: 1, flexBasis: "auto" },
  "flex-none": { flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
  grow: { flexGrow: 1 },
  "grow-0": { flexGrow: 0 },
  shrink: { flexShrink: 1 },
  "shrink-0": { flexShrink: 0 },

  // Justify content
  "justify-start": { justifyContent: "flex-start" },
  "justify-center": { justifyContent: "center" },
  "justify-end": { justifyContent: "flex-end" },
  "justify-between": { justifyContent: "space-between" },
  "justify-around": { justifyContent: "space-around" },
  "justify-evenly": { justifyContent: "space-evenly" },

  // Align items
  "items-start": { alignItems: "flex-start" },
  "items-center": { alignItems: "center" },
  "items-end": { alignItems: "flex-end" },
  "items-stretch": { alignItems: "stretch" },
  "items-baseline": { alignItems: "baseline" },

  // Align self
  "self-auto": { alignSelf: "auto" },
  "self-start": { alignSelf: "flex-start" },
  "self-center": { alignSelf: "center" },
  "self-end": { alignSelf: "flex-end" },
  "self-stretch": { alignSelf: "stretch" },

  // Typography
  "font-bold": { bold: true },
  "font-normal": { bold: false },
  italic: { italic: true },
  "not-italic": { italic: false },
  underline: { underline: true },
  "no-underline": { underline: false },
  "line-through": { strikethrough: true },

  // Border base
  border: { border: true, borderStyle: "single" },
  "border-0": { border: false },
  "border-2": { border: true, borderStyle: "double" },
  "border-4": { border: true, borderStyle: "heavy" },
  "border-t": { border: ["top"] },
  "border-r": { border: ["right"] },
  "border-b": { border: ["bottom"] },
  "border-l": { border: ["left"] },
  rounded: { borderStyle: "rounded" },
  "rounded-none": { borderStyle: "single" },

  // Visibility
  hidden: { visible: false },
  invisible: { visible: false },
  visible: { visible: true },

  // Overflow
  "overflow-hidden": { overflow: "hidden" },
  "overflow-visible": { overflow: "visible" },
  "overflow-scroll": { overflow: "scroll" },
  "overflow-auto": { overflow: "scroll" },

  // Position
  static: { position: "static" },
  relative: { position: "relative" },
  absolute: { position: "absolute" },
  "inset-0": { top: 0, right: 0, bottom: 0, left: 0 }
}

/** Pattern-based mappers for classes with values */
const patternMappers: Array<{
  pattern: RegExp
  mapper: (match: RegExpMatchArray) => Partial<TuiStyleProps> | undefined
}> = [
  // Padding
  {
    pattern: /^p-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { padding: v } : undefined
    }
  },
  {
    pattern: /^px-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { paddingLeft: v, paddingRight: v } : undefined
    }
  },
  {
    pattern: /^py-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { paddingTop: v, paddingBottom: v } : undefined
    }
  },
  {
    pattern: /^pt-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { paddingTop: v } : undefined
    }
  },
  {
    pattern: /^pr-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { paddingRight: v } : undefined
    }
  },
  {
    pattern: /^pb-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { paddingBottom: v } : undefined
    }
  },
  {
    pattern: /^pl-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { paddingLeft: v } : undefined
    }
  },

  // Margin
  { pattern: /^m-auto$/, mapper: () => ({ margin: "auto" }) },
  { pattern: /^mx-auto$/, mapper: () => ({ marginLeft: "auto", marginRight: "auto" }) },
  { pattern: /^my-auto$/, mapper: () => ({ marginTop: "auto", marginBottom: "auto" }) },
  {
    pattern: /^m-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { margin: v } : undefined
    }
  },
  {
    pattern: /^mx-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { marginLeft: v, marginRight: v } : undefined
    }
  },
  {
    pattern: /^my-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { marginTop: v, marginBottom: v } : undefined
    }
  },
  {
    pattern: /^mt-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { marginTop: v } : undefined
    }
  },
  {
    pattern: /^mr-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { marginRight: v } : undefined
    }
  },
  {
    pattern: /^mb-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { marginBottom: v } : undefined
    }
  },
  {
    pattern: /^ml-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { marginLeft: v } : undefined
    }
  },

  // Gap - more specific patterns first
  {
    pattern: /^gap-x-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { columnGap: v } : undefined
    }
  },
  {
    pattern: /^gap-y-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { rowGap: v } : undefined
    }
  },
  {
    pattern: /^gap-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!)
      return v !== undefined ? { gap: v } : undefined
    }
  },

  // Width
  {
    pattern: /^w-(.+)$/,
    mapper: (m) => {
      const v = parseSizeValue(m[1]!)
      return v !== undefined ? { width: v } : undefined
    }
  },
  {
    pattern: /^min-w-(.+)$/,
    mapper: (m) => {
      const v = parseSizeValue(m[1]!)
      return v !== undefined ? { minWidth: v } : undefined
    }
  },
  {
    pattern: /^max-w-(.+)$/,
    mapper: (m) => {
      const v = parseSizeValue(m[1]!)
      return v !== undefined ? { maxWidth: v } : undefined
    }
  },

  // Height
  {
    pattern: /^h-(.+)$/,
    mapper: (m) => {
      const v = parseSizeValue(m[1]!)
      return v !== undefined ? { height: v } : undefined
    }
  },
  {
    pattern: /^min-h-(.+)$/,
    mapper: (m) => {
      const v = parseSizeValue(m[1]!)
      return v !== undefined ? { minHeight: v } : undefined
    }
  },
  {
    pattern: /^max-h-(.+)$/,
    mapper: (m) => {
      const v = parseSizeValue(m[1]!)
      return v !== undefined ? { maxHeight: v } : undefined
    }
  },

  // Background color
  {
    pattern: /^bg-(.+)$/,
    mapper: (m) => {
      const color = parseColor(m[1]!)
      return color ? { backgroundColor: color, bg: color } : undefined
    }
  },

  // Text/foreground color
  {
    pattern: /^text-(.+)$/,
    mapper: (m) => {
      const color = parseColor(m[1]!)
      return color ? { fg: color } : undefined
    }
  },

  // Border color
  {
    pattern: /^border-(.+)$/,
    mapper: (m) => {
      const color = parseColor(m[1]!)
      return color ? { borderColor: color } : undefined
    }
  },

  // Opacity
  {
    pattern: /^opacity-(\d+)$/,
    mapper: (m) => {
      const v = parseInt(m[1]!, 10) / 100
      return { opacity: v }
    }
  },

  // Z-index
  {
    pattern: /^z-(\d+)$/,
    mapper: (m) => {
      return { zIndex: parseInt(m[1]!, 10) }
    }
  },

  // Position values
  {
    pattern: /^top-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!) ?? (m[1] === "auto" ? "auto" : undefined)
      return v !== undefined ? { top: v } : undefined
    }
  },
  {
    pattern: /^right-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!) ?? (m[1] === "auto" ? "auto" : undefined)
      return v !== undefined ? { right: v } : undefined
    }
  },
  {
    pattern: /^bottom-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!) ?? (m[1] === "auto" ? "auto" : undefined)
      return v !== undefined ? { bottom: v } : undefined
    }
  },
  {
    pattern: /^left-(.+)$/,
    mapper: (m) => {
      const v = parseSpacing(m[1]!) ?? (m[1] === "auto" ? "auto" : undefined)
      return v !== undefined ? { left: v } : undefined
    }
  }
]

function mapSingleClass(className: string): Partial<TuiStyleProps> | undefined {
  // Check direct mappers
  const direct = classMappers[className]
  if (direct) {
    return typeof direct === "function" ? direct(className) : direct
  }

  // Check pattern mappers
  for (const { mapper, pattern } of patternMappers) {
    const match = className.match(pattern)
    if (match) {
      return mapper(match)
    }
  }

  return undefined
}

export interface MapResult {
  styles: TuiStyleProps
  unmapped: Array<string>
}

/**
 * Convert Tailwind class string to OpenTUI style props
 */
export function tailwindToTui(classes: string): MapResult {
  const styles: TuiStyleProps = {}
  const unmapped: Array<string> = []

  const classList = classes.split(/\s+/).filter(Boolean)

  for (const cls of classList) {
    // Skip responsive prefixes (sm:, md:, lg:, etc.)
    if (/^(sm|md|lg|xl|2xl):/.test(cls)) {
      unmapped.push(cls)
      continue
    }

    // Skip state prefixes (hover:, focus:, etc.)
    if (/^(hover|focus|active|disabled|group-hover):/.test(cls)) {
      unmapped.push(cls)
      continue
    }

    // Skip dark mode prefix
    if (cls.startsWith("dark:")) {
      unmapped.push(cls)
      continue
    }

    const mapped = mapSingleClass(cls)
    if (mapped) {
      Object.assign(styles, mapped)
    } else {
      unmapped.push(cls)
    }
  }

  return { styles, unmapped }
}

/**
 * Simple version that just returns styles (ignores unmapped)
 */
export function tw(classes: string): TuiStyleProps {
  return tailwindToTui(classes).styles
}

export default tailwindToTui
