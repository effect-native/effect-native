/**
 * Style Bridge: Applies Tailwind classes during DOM->TUI conversion
 *
 * This module extracts CSS classes from DOM elements and converts them to
 * OpenTUI style properties using the tailwind-mapper.
 *
 * Features:
 * - Extracts className from elements
 * - Passes through tailwindToTui() for conversion
 * - Handles inline styles via data-* attributes as fallback
 * - Maps CSS custom properties (shadcn theme variables) to TUI colors
 *
 * @module bridge/style-bridge
 */

import type { MappedRenderable } from "./node-map.js"
import { tailwindToTui, type TuiStyleProps } from "./tailwind-mapper.js"

/**
 * Common CSS custom properties used by shadcn/ui components.
 * Maps CSS variable names to reasonable TUI color defaults.
 *
 * These are typically defined in :root and use HSL values in shadcn.
 * We map them to hex colors for TUI compatibility.
 */
const CSS_VAR_DEFAULTS: Record<string, string> = {
  // Base colors
  "--background": "#09090B", // zinc-950 (dark theme default)
  "--foreground": "#FAFAFA", // zinc-50
  "--card": "#09090B",
  "--card-foreground": "#FAFAFA",
  "--popover": "#09090B",
  "--popover-foreground": "#FAFAFA",

  // Primary
  "--primary": "#FAFAFA", // zinc-50
  "--primary-foreground": "#18181B", // zinc-900

  // Secondary
  "--secondary": "#27272A", // zinc-800
  "--secondary-foreground": "#FAFAFA",

  // Muted
  "--muted": "#27272A",
  "--muted-foreground": "#A1A1AA", // zinc-400

  // Accent
  "--accent": "#27272A",
  "--accent-foreground": "#FAFAFA",

  // Destructive
  "--destructive": "#7F1D1D", // red-900
  "--destructive-foreground": "#FAFAFA",

  // Border and input
  "--border": "#27272A",
  "--input": "#27272A",
  "--ring": "#D4D4D8" // zinc-300
}

/**
 * Interface for the style bridge system.
 * Bridges DOM element styles to TUI Renderable properties.
 */
export interface StyleBridge {
  /** Extract classes from element and return TUI props */
  getStyleProps(element: Element): Record<string, unknown>

  /** Apply classes to existing Renderable */
  applyStyles(element: Element, renderable: MappedRenderable): void
}

/** Options for creating a style bridge */
export interface StyleBridgeOptions {
  /** Enable debug logging */
  debug?: boolean

  /** Custom CSS variable overrides */
  cssVarOverrides?: Record<string, string>
}

/**
 * Extract the className from an Element.
 * Handles both className property and getAttribute fallback.
 */
function getClassName(element: Element): string {
  // Try className property first (works for HTMLElement)
  if ("className" in element && typeof element.className === "string") {
    return element.className
  }

  // Fallback to getAttribute (works for all elements)
  return element.getAttribute("class") || ""
}

/**
 * Convert kebab-case to camelCase
 */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Extract inline style data attributes from an element.
 * Supports data-tui-* attributes for direct TUI property overrides.
 * Note: HTML lowercases attribute names, so data-tui-borderStyle becomes data-tui-borderstyle
 *
 * @example
 * <div data-tui-bg="#ff0000" data-tui-fg="white">
 */
function getDataAttributes(element: Element): Partial<TuiStyleProps> {
  const props: Partial<TuiStyleProps> = {}

  // Get all attributes and filter for data-tui-* pattern
  const attrs = element.attributes
  if (!attrs) return props

  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]
    if (!attr) continue
    if (attr.name.startsWith("data-tui-")) {
      // Get raw prop name (lowercased by HTML) and convert to camelCase
      const rawName = attr.name.slice("data-tui-".length)
      const propName = kebabToCamel(rawName)
      const value = attr.value

      // Map common data attributes to TuiStyleProps
      switch (propName) {
        case "bg":
        case "backgroundColor":
        case "backgroundcolor":
          props.bg = value
          props.backgroundColor = value
          break
        case "fg":
          props.fg = value
          break
        case "border":
          props.border = value === "true"
          break
        case "borderStyle":
        case "borderstyle":
          if (["single", "double", "rounded", "heavy"].includes(value)) {
            props.borderStyle = value as "single" | "double" | "rounded" | "heavy"
          }
          break
        case "borderColor":
        case "bordercolor":
          props.borderColor = value
          break
        case "bold":
          props.bold = value === "true"
          break
        case "italic":
          props.italic = value === "true"
          break
        case "underline":
          props.underline = value === "true"
          break
        case "dim":
          props.dim = value === "true"
          break
        case "visible":
          props.visible = value !== "false"
          break
        case "zIndex":
        case "zindex":
          props.zIndex = parseInt(value, 10)
          break
        // Numeric props (handle both camelCase and lowercase)
        case "padding":
        case "paddingTop":
        case "paddingtop":
        case "paddingRight":
        case "paddingright":
        case "paddingBottom":
        case "paddingbottom":
        case "paddingLeft":
        case "paddingleft":
        case "margin":
        case "marginTop":
        case "margintop":
        case "marginRight":
        case "marginright":
        case "marginBottom":
        case "marginbottom":
        case "marginLeft":
        case "marginleft":
        case "gap":
        case "rowGap":
        case "rowgap":
        case "columnGap":
        case "columngap":
        case "width":
        case "height":
        case "minWidth":
        case "minwidth":
        case "minHeight":
        case "minheight":
        case "maxWidth":
        case "maxwidth":
        case "maxHeight":
        case "maxheight":
        case "top":
        case "right":
        case "bottom":
        case "left":
        case "flexGrow":
        case "flexgrow":
        case "flexShrink":
        case "flexshrink":
        case "opacity": {
          // Normalize the property name to canonical camelCase form
          const normalizedProp = propName.replace(
            /^(padding|margin|flex|row|column|min|max)(top|right|bottom|left|grow|shrink|gap|width|height)$/i,
            (_, prefix, suffix) => prefix + suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase()
          )
          const numValue = parseFloat(value)
          if (!isNaN(numValue)) {
            ;(props as Record<string, number>)[normalizedProp] = numValue
          } else if (value === "auto") {
            ;(props as Record<string, string>)[normalizedProp] = "auto"
          } else if (value.endsWith("%")) {
            ;(props as Record<string, string>)[normalizedProp] = value
          }
          break
        }
        // Enum props (handle both camelCase and lowercase)
        case "flexDirection":
        case "flexdirection":
          if (["row", "column", "row-reverse", "column-reverse"].includes(value)) {
            props.flexDirection = value as "row" | "column" | "row-reverse" | "column-reverse"
          }
          break
        case "flexWrap":
        case "flexwrap":
          if (["no-wrap", "wrap", "wrap-reverse"].includes(value)) {
            props.flexWrap = value as "no-wrap" | "wrap" | "wrap-reverse"
          }
          break
        case "justifyContent":
        case "justifycontent":
          if (
            [
              "flex-start",
              "center",
              "flex-end",
              "space-between",
              "space-around",
              "space-evenly"
            ].includes(value)
          ) {
            props.justifyContent = value as
              | "flex-start"
              | "center"
              | "flex-end"
              | "space-between"
              | "space-around"
              | "space-evenly"
          }
          break
        case "alignItems":
        case "alignitems":
          if (["auto", "flex-start", "center", "flex-end", "stretch", "baseline"].includes(value)) {
            props.alignItems = value as "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline"
          }
          break
        case "alignSelf":
        case "alignself":
          if (["auto", "flex-start", "center", "flex-end", "stretch"].includes(value)) {
            props.alignSelf = value as "auto" | "flex-start" | "center" | "flex-end" | "stretch"
          }
          break
        case "position":
          if (["static", "relative", "absolute"].includes(value)) {
            props.position = value as "static" | "relative" | "absolute"
          }
          break
        case "overflow":
          if (["visible", "hidden", "scroll"].includes(value)) {
            props.overflow = value as "visible" | "hidden" | "scroll"
          }
          break
      }
    }
  }

  return props
}

/**
 * Resolve CSS custom property references in a value.
 * Converts var(--property-name) to actual values.
 */
function resolveCssVars(
  value: string | undefined,
  cssVarMap: Record<string, string>
): string | undefined {
  if (!value) return value

  // Match var(--property-name) or var(--property-name, fallback)
  const varPattern = /var\(([^,)]+)(?:,\s*([^)]+))?\)/g

  return value.replace(varPattern, (_, varName: string, fallback?: string) => {
    const trimmedName = varName.trim()
    return cssVarMap[trimmedName] ?? fallback?.trim() ?? ""
  })
}

/**
 * Map shadcn theme classes to CSS variable-based colors.
 * These are classes like bg-background, text-foreground, etc.
 */
function mapThemeClass(
  className: string,
  cssVarMap: Record<string, string>
): Partial<TuiStyleProps> | undefined {
  // Background theme classes
  const bgMatch = className.match(
    /^bg-(background|foreground|card|popover|primary|secondary|muted|accent|destructive)(?:-(foreground))?$/
  )
  if (bgMatch) {
    const [, base, sub] = bgMatch
    const varName = sub ? `--${base}-${sub}` : `--${base}`
    const color = cssVarMap[varName]
    return color ? { bg: color, backgroundColor: color } : undefined
  }

  // Text theme classes
  const textMatch = className.match(
    /^text-(background|foreground|card|popover|primary|secondary|muted|accent|destructive)(?:-(foreground))?$/
  )
  if (textMatch) {
    const [, base, sub] = textMatch
    const varName = sub ? `--${base}-${sub}` : `--${base}`
    const color = cssVarMap[varName]
    return color ? { fg: color } : undefined
  }

  // Border theme classes
  const borderMatch = className.match(
    /^border-(background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring)(?:-(foreground))?$/
  )
  if (borderMatch) {
    const [, base, sub] = borderMatch
    const varName = sub ? `--${base}-${sub}` : `--${base}`
    const color = cssVarMap[varName]
    return color ? { borderColor: color } : undefined
  }

  return undefined
}

/**
 * Creates a StyleBridge instance.
 *
 * @example
 * ```ts
 * const bridge = createStyleBridge({ debug: true })
 * const props = bridge.getStyleProps(element)
 * // { bg: "#09090B", fg: "#FAFAFA", padding: 2 }
 * ```
 */
export function createStyleBridge(options: StyleBridgeOptions = {}): StyleBridge {
  const { cssVarOverrides = {}, debug = false } = options

  // Merge default CSS vars with overrides
  const cssVarMap: Record<string, string> = {
    ...CSS_VAR_DEFAULTS,
    ...cssVarOverrides
  }

  const log = debug ? console.log.bind(console, "[StyleBridge]") : () => {}

  return {
    getStyleProps(element: Element): Record<string, unknown> {
      // 1. Get className and convert via tailwindToTui
      const className = getClassName(element)
      const { styles: tailwindStyles, unmapped } = tailwindToTui(className)

      log(`Processing element: <${element.tagName?.toLowerCase() ?? "unknown"}>`)
      log(`  className: "${className}"`)

      // 2. Process unmapped classes for theme variables
      const themeStyles: Partial<TuiStyleProps> = {}
      for (const cls of unmapped) {
        const mapped = mapThemeClass(cls, cssVarMap)
        if (mapped) {
          Object.assign(themeStyles, mapped)
        }
      }

      // 3. Get data-tui-* attribute overrides
      const dataStyles = getDataAttributes(element)

      // 4. Resolve any CSS var() references in the combined styles
      const combinedStyles = { ...tailwindStyles, ...themeStyles, ...dataStyles }

      // Resolve CSS vars in color properties
      for (const key of ["fg", "bg", "backgroundColor", "borderColor"] as const) {
        const value = combinedStyles[key]
        if (typeof value === "string") {
          const resolved = resolveCssVars(value, cssVarMap)
          if (resolved) {
            combinedStyles[key] = resolved
          }
        }
      }

      if (debug) {
        log(`  tailwind styles:`, tailwindStyles)
        log(`  theme styles:`, themeStyles)
        log(`  data styles:`, dataStyles)
        log(`  combined:`, combinedStyles)
      }

      return combinedStyles
    },

    applyStyles(element: Element, renderable: MappedRenderable): void {
      const props = this.getStyleProps(element)

      log(`Applying styles to renderable:`, props)

      // Apply each property to the renderable
      // The renderable should have setters for these properties
      const target = renderable as unknown as Record<string, unknown>
      for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) {
          try {
            target[key] = value
          } catch (e) {
            // Property might be read-only, skip silently in production
            if (debug) {
              log(`  Failed to set ${key}:`, e)
            }
          }
        }
      }
    }
  }
}

export default createStyleBridge
