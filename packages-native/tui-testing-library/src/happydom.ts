/**
 * DOM environment setup for ghostty-web testing in Bun/Node.
 *
 * This module registers happy-dom globals and mocks the Canvas 2D context
 * which ghostty-web requires for rendering (even though we don't need actual pixels).
 *
 * Usage:
 * - Import this module as a preload in bunfig.toml: `preload = ["./src/happydom.ts"]`
 * - Or import directly in test setup: `import "@effect-native/tui-testing-library/happydom"`
 *
 * @since 0.1.0
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()

// ghostty-web uses Canvas 2D context for rendering.
// happy-dom doesn't fully implement Canvas, so we mock it with stubs.
// This is sufficient because tests only need the terminal's internal buffer state,
// not actual rendered pixels.
const originalGetContext = HTMLCanvasElement.prototype.getContext
// @ts-expect-error - we're overriding with a simplified mock
HTMLCanvasElement.prototype.getContext = function(contextType: string, _options?: unknown) {
  if (contextType === "2d") {
    return {
      canvas: this,
      fillStyle: "#000000",
      strokeStyle: "#000000",
      font: "12px monospace",
      textAlign: "start",
      textBaseline: "alphabetic",
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      imageSmoothingEnabled: true,
      lineWidth: 1,
      lineCap: "butt",
      lineJoin: "miter",
      miterLimit: 10,
      shadowBlur: 0,
      shadowColor: "rgba(0, 0, 0, 0)",
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: (text: string) => ({ width: text.length * 8 }),
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      rotate: () => {},
      translate: () => {},
      transform: () => {},
      setTransform: () => {},
      resetTransform: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createPattern: () => null,
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      arc: () => {},
      arcTo: () => {},
      ellipse: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      isPointInPath: () => false,
      isPointInStroke: () => false,
      getTransform: () => ({}),
      getImageData: () => ({
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0
      }),
      putImageData: () => {},
      createImageData: () => ({
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0
      })
    } as unknown as CanvasRenderingContext2D
  }
  return originalGetContext.call(this, contextType as "2d", _options)
}
