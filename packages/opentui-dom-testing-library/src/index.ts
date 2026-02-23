/**
 * @effect-native/opentui-dom-testing-library
 *
 * Testing utilities for rendering React components in happy-dom,
 * similar to @testing-library/react.
 *
 * Usage:
 * ```ts
 * import { setupHappyDom, render, screen, cleanup } from "@effect-native/opentui-dom-testing-library"
 *
 * // Call once before tests (or in a setup file)
 * setupHappyDom()
 *
 * // In your tests:
 * const { getByText } = render(<MyComponent />)
 * expect(getByText("Hello")).toBeTruthy()
 *
 * // Or use screen:
 * render(<MyComponent />)
 * expect(screen.getByText("Hello")).toBeTruthy()
 *
 * // Clean up after tests
 * cleanup()
 * ```
 */

// Setup
export { ensureHappyDom, isHappyDomSetup, setupHappyDom, teardownHappyDom } from "./setup.js"

// Render
export { cleanup, render, type RenderOptions, type RenderResult } from "./render.js"

// Screen
export { screen } from "./screen.js"

// Events
export { createEvent, fireEvent, type Modifiers } from "./events.js"

// Queries
export {
  type BoundQueries,
  type ByRoleOptions,
  findAllByLabelText,
  findAllByRole,
  findAllByTestId,
  findAllByText,
  findByLabelText,
  findByRole,
  findByTestId,
  findByText,
  getAllByLabelText,
  getAllByRole,
  getAllByTestId,
  getAllByText,
  // LabelText queries
  getByLabelText,
  // Role queries
  getByRole,
  // TestId queries
  getByTestId,
  // Text queries
  getByText,
  // Utils
  getQueriesForElement,
  queryAllByLabelText,
  queryAllByRole,
  queryAllByTestId,
  queryAllByText,
  queryByLabelText,
  queryByRole,
  queryByTestId,
  queryByText,
  type QueryOptions,
  // Types
  type TextMatch,
  waitFor
} from "./queries.js"
