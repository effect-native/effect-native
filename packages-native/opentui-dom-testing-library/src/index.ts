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
export { setupHappyDom, teardownHappyDom, isHappyDomSetup, ensureHappyDom } from "./setup.js"

// Render
export { render, cleanup, type RenderOptions, type RenderResult } from "./render.js"

// Screen
export { screen } from "./screen.js"

// Events
export { fireEvent, createEvent, type Modifiers } from "./events.js"

// Queries
export {
  // Types
  type TextMatch,
  type QueryOptions,
  type ByRoleOptions,
  type BoundQueries,
  // Text queries
  getByText,
  getAllByText,
  queryByText,
  queryAllByText,
  findByText,
  findAllByText,
  // Role queries
  getByRole,
  getAllByRole,
  queryByRole,
  queryAllByRole,
  findByRole,
  findAllByRole,
  // TestId queries
  getByTestId,
  getAllByTestId,
  queryByTestId,
  queryAllByTestId,
  findByTestId,
  findAllByTestId,
  // LabelText queries
  getByLabelText,
  getAllByLabelText,
  queryByLabelText,
  queryAllByLabelText,
  findByLabelText,
  findAllByLabelText,
  // Utils
  getQueriesForElement,
  waitFor
} from "./queries.js"
