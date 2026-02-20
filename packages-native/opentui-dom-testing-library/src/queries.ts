/**
 * Query functions for finding elements in the DOM.
 * Follows @testing-library/dom patterns: getBy, queryBy, findBy, getAllBy, queryAllBy, findAllBy
 */

// ----- Types -----

export type TextMatch = string | RegExp | ((text: string, element: Element) => boolean)

export interface QueryOptions {
  exact?: boolean // default true
  normalizer?: (text: string) => string
  timeout?: number // for findBy variants
}

export interface ByRoleOptions extends QueryOptions {
  name?: TextMatch
  checked?: boolean
  selected?: boolean
  pressed?: boolean
  expanded?: boolean
  level?: number // for heading
}

// ----- Utilities -----

/** Default text normalizer: trims and collapses whitespace */
function getDefaultNormalizer(): (text: string) => string {
  return (text: string) => text.replace(/\s+/g, " ").trim()
}

/** Tags to ignore when searching for text content */
const IGNORED_TAGS = new Set(["SCRIPT", "STYLE"])

/** Node type constants (since Node.TEXT_NODE may not be available as global in happy-dom) */
const TEXT_NODE = 3
const ELEMENT_NODE = 1

/** Check if text matches using the matcher */
function matches(
  text: string,
  matcher: TextMatch,
  normalizer: (text: string) => string,
  exact: boolean
): boolean {
  const normalizedText = normalizer(text)

  if (typeof matcher === "function") {
    return matcher(normalizedText, null as unknown as Element)
  }

  if (matcher instanceof RegExp) {
    return matcher.test(normalizedText)
  }

  // String matcher
  const normalizedMatcher = normalizer(matcher)
  if (exact) {
    return normalizedText === normalizedMatcher
  }
  // Case-insensitive substring match
  return normalizedText.toLowerCase().includes(normalizedMatcher.toLowerCase())
}

// ----- Text Queries -----

/** Get text content excluding script/style tags using recursive traversal */
function getTextContent(element: HTMLElement): string {
  let text = ""

  for (const child of element.childNodes) {
    if (child.nodeType === TEXT_NODE) {
      const parent = child.parentElement
      if (!parent || !IGNORED_TAGS.has(parent.tagName)) {
        text += child.textContent || ""
      }
    } else if (child.nodeType === ELEMENT_NODE) {
      const childElement = child as HTMLElement
      if (!IGNORED_TAGS.has(childElement.tagName)) {
        text += getTextContent(childElement)
      }
    }
  }

  return text
}

/** Check if element has direct text content (not just from children) */
function hasDirectTextContent(element: HTMLElement): boolean {
  for (const child of element.childNodes) {
    if (child.nodeType === TEXT_NODE && child.textContent?.trim()) {
      return true
    }
  }
  return !element.querySelector("*")
}

/** Recursively collect elements that match the text */
function collectTextMatches(
  element: HTMLElement,
  text: TextMatch,
  normalizer: (text: string) => string,
  exact: boolean,
  results: Array<HTMLElement>
): void {
  if (IGNORED_TAGS.has(element.tagName)) {
    return
  }

  if (hasDirectTextContent(element)) {
    const textContent = getTextContent(element)
    if (textContent && matches(textContent, text, normalizer, exact)) {
      results.push(element)
    }
  }

  for (const child of element.children) {
    collectTextMatches(child as HTMLElement, text, normalizer, exact, results)
  }
}

function queryAllByTextImpl(
  container: HTMLElement,
  text: TextMatch,
  options: QueryOptions = {}
): Array<HTMLElement> {
  const { exact = true, normalizer = getDefaultNormalizer() } = options
  const results: Array<HTMLElement> = []
  collectTextMatches(container, text, normalizer, exact, results)
  return results
}

// ----- Role Queries -----

const IMPLICIT_ROLES: Record<string, Array<string>> = {
  button: ["button", "input[type=\"button\"]", "input[type=\"submit\"]", "input[type=\"reset\"]"],
  link: ["a[href]"],
  checkbox: ["input[type=\"checkbox\"]"],
  radio: ["input[type=\"radio\"]"],
  textbox: [
    "input:not([type])",
    "input[type=\"text\"]",
    "input[type=\"email\"]",
    "input[type=\"password\"]",
    "textarea"
  ],
  heading: ["h1", "h2", "h3", "h4", "h5", "h6"],
  listitem: ["li"],
  list: ["ul", "ol"],
  option: ["option"],
  combobox: ["select"],
  img: ["img[alt]"],
  navigation: ["nav"],
  main: ["main"],
  article: ["article"],
  banner: ["header"],
  contentinfo: ["footer"],
  region: ["section[aria-label]", "section[aria-labelledby]"]
}

function getHeadingLevel(element: HTMLElement): number | null {
  const match = element.tagName.match(/^H([1-6])$/i)
  if (match) return parseInt(match[1], 10)
  const ariaLevel = element.getAttribute("aria-level")
  if (ariaLevel) return parseInt(ariaLevel, 10)
  return null
}

function getAccessibleName(element: HTMLElement): string {
  const ariaLabel = element.getAttribute("aria-label")
  if (ariaLabel) return ariaLabel

  const labelledBy = element.getAttribute("aria-labelledby")
  if (labelledBy) {
    const doc = element.ownerDocument
    const labelElement = doc.getElementById(labelledBy)
    if (labelElement) return labelElement.textContent || ""
  }

  if (element.tagName === "INPUT" || element.tagName === "SELECT" || element.tagName === "TEXTAREA") {
    const id = element.getAttribute("id")
    if (id) {
      const doc = element.ownerDocument
      const label = doc.querySelector(`label[for="${id}"]`)
      if (label) return label.textContent || ""
    }
  }

  const title = element.getAttribute("title")
  if (title) return title

  return element.textContent || ""
}

function elementMatchesRole(element: HTMLElement, role: string): boolean {
  if (element.getAttribute("role") === role) {
    return true
  }

  const implicitSelectors = IMPLICIT_ROLES[role]
  if (implicitSelectors) {
    for (const selector of implicitSelectors) {
      if (element.matches(selector)) {
        return true
      }
    }
  }

  return false
}

function elementMatchesState(element: HTMLElement, options: ByRoleOptions): boolean {
  if (options.checked !== undefined) {
    const isChecked = (element as HTMLInputElement).checked || element.getAttribute("aria-checked") === "true"
    if (isChecked !== options.checked) return false
  }

  if (options.selected !== undefined) {
    const isSelected = (element as HTMLOptionElement).selected || element.getAttribute("aria-selected") === "true"
    if (isSelected !== options.selected) return false
  }

  if (options.pressed !== undefined) {
    const isPressed = element.getAttribute("aria-pressed") === "true"
    if (isPressed !== options.pressed) return false
  }

  if (options.expanded !== undefined) {
    const isExpanded = element.getAttribute("aria-expanded") === "true"
    if (isExpanded !== options.expanded) return false
  }

  if (options.level !== undefined) {
    const level = getHeadingLevel(element)
    if (level !== options.level) return false
  }

  return true
}

function queryAllByRoleImpl(
  container: HTMLElement,
  role: string,
  options: ByRoleOptions = {}
): Array<HTMLElement> {
  const { exact = true, name, normalizer = getDefaultNormalizer() } = options
  const results: Array<HTMLElement> = []

  const allElements = container.querySelectorAll("*")

  for (const node of allElements) {
    const element = node as HTMLElement

    if (!elementMatchesRole(element, role)) continue
    if (!elementMatchesState(element, options)) continue

    if (name !== undefined) {
      const accessibleName = getAccessibleName(element)
      if (!matches(accessibleName, name, normalizer, exact)) continue
    }

    results.push(element)
  }

  return results
}

// ----- TestId Queries -----

function queryAllByTestIdImpl(
  container: HTMLElement,
  testId: TextMatch,
  options: QueryOptions = {}
): Array<HTMLElement> {
  const { exact = true, normalizer = getDefaultNormalizer() } = options

  if (typeof testId === "string" && exact) {
    return [...container.querySelectorAll(`[data-testid="${testId}"]`)] as Array<HTMLElement>
  }

  const elements = container.querySelectorAll("[data-testid]")
  const results: Array<HTMLElement> = []

  for (const element of elements) {
    const value = element.getAttribute("data-testid") || ""
    if (matches(value, testId, normalizer, exact)) {
      results.push(element as HTMLElement)
    }
  }

  return results
}

// ----- LabelText Queries -----

function queryAllByLabelTextImpl(
  container: HTMLElement,
  text: TextMatch,
  options: QueryOptions = {}
): Array<HTMLElement> {
  const { exact = true, normalizer = getDefaultNormalizer() } = options
  const results: Array<HTMLElement> = []

  const labels = container.querySelectorAll("label")
  for (const label of labels) {
    const labelText = label.textContent || ""
    if (matches(labelText, text, normalizer, exact)) {
      const forId = label.getAttribute("for")
      if (forId) {
        const input = container.querySelector(`#${forId}`) as HTMLElement | null
        if (input) results.push(input)
      } else {
        const input = label.querySelector("input, select, textarea") as HTMLElement | null
        if (input) results.push(input)
      }
    }
  }

  const ariaElements = container.querySelectorAll("[aria-label]")
  for (const element of ariaElements) {
    const ariaLabel = element.getAttribute("aria-label") || ""
    if (matches(ariaLabel, text, normalizer, exact)) {
      if (!results.includes(element as HTMLElement)) {
        results.push(element as HTMLElement)
      }
    }
  }

  return results
}

// ----- waitFor Implementation -----

interface WaitForOptions {
  timeout?: number
  interval?: number
}

async function waitFor<T>(
  callback: () => T,
  options: WaitForOptions = {}
): Promise<T> {
  const { interval = 50, timeout = 1000 } = options

  const startTime = Date.now()
  let lastError: Error | undefined

  while (Date.now() - startTime < timeout) {
    try {
      const result = callback()
      return result
    } catch (error) {
      lastError = error as Error
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  throw lastError || new Error(`Timed out after ${timeout}ms`)
}

// ----- Query Builders -----

function buildQueries<TArgs extends Array<unknown>>(
  queryAllBy: (container: HTMLElement, ...args: TArgs) => Array<HTMLElement>,
  getName: (...args: TArgs) => string
) {
  const queryBy = (container: HTMLElement, ...args: TArgs): HTMLElement | null => {
    const results = queryAllBy(container, ...args)
    if (results.length > 1) {
      throw new Error(`Found multiple elements with ${getName(...args)}`)
    }
    return results[0] ?? null
  }

  const getBy = (container: HTMLElement, ...args: TArgs): HTMLElement => {
    const results = queryAllBy(container, ...args)
    if (results.length === 0) {
      throw new Error(`Unable to find element with ${getName(...args)}`)
    }
    if (results.length > 1) {
      throw new Error(`Found multiple elements with ${getName(...args)}`)
    }
    return results[0]
  }

  const getAllBy = (container: HTMLElement, ...args: TArgs): Array<HTMLElement> => {
    const results = queryAllBy(container, ...args)
    if (results.length === 0) {
      throw new Error(`Unable to find any elements with ${getName(...args)}`)
    }
    return results
  }

  const queryAllByFn = (container: HTMLElement, ...args: TArgs): Array<HTMLElement> => {
    return queryAllBy(container, ...args)
  }

  const findBy = async (container: HTMLElement, ...args: TArgs): Promise<HTMLElement> => {
    const lastArg = args[args.length - 1] as QueryOptions | undefined
    const timeout = lastArg?.timeout ?? 1000
    return waitFor(() => getBy(container, ...args), { timeout })
  }

  const findAllBy = async (container: HTMLElement, ...args: TArgs): Promise<Array<HTMLElement>> => {
    const lastArg = args[args.length - 1] as QueryOptions | undefined
    const timeout = lastArg?.timeout ?? 1000
    return waitFor(() => getAllBy(container, ...args), { timeout })
  }

  return { queryBy, getBy, getAllBy, queryAllBy: queryAllByFn, findBy, findAllBy }
}

// ----- Build All Queries -----

const textQueries = buildQueries(
  (container: HTMLElement, text: TextMatch, options?: QueryOptions) => queryAllByTextImpl(container, text, options),
  (text: TextMatch, _options?: QueryOptions) => `text: ${text}`
)

const roleQueries = buildQueries(
  (container: HTMLElement, role: string, options?: ByRoleOptions) => queryAllByRoleImpl(container, role, options),
  (role: string, options?: ByRoleOptions) =>
    options?.name ? `role "${role}" with name "${options.name}"` : `role "${role}"`
)

const testIdQueries = buildQueries(
  (container: HTMLElement, testId: TextMatch, options?: QueryOptions) =>
    queryAllByTestIdImpl(container, testId, options),
  (testId: TextMatch, _options?: QueryOptions) => `data-testid: ${testId}`
)

const labelTextQueries = buildQueries(
  (container: HTMLElement, text: TextMatch, options?: QueryOptions) =>
    queryAllByLabelTextImpl(container, text, options),
  (text: TextMatch, _options?: QueryOptions) => `label text: ${text}`
)

// ----- Exports -----

export const getByText = textQueries.getBy
export const getAllByText = textQueries.getAllBy
export const queryByText = textQueries.queryBy
export const queryAllByText = textQueries.queryAllBy
export const findByText = textQueries.findBy
export const findAllByText = textQueries.findAllBy

export const getByRole = roleQueries.getBy
export const getAllByRole = roleQueries.getAllBy
export const queryByRole = roleQueries.queryBy
export const queryAllByRole = roleQueries.queryAllBy
export const findByRole = roleQueries.findBy
export const findAllByRole = roleQueries.findAllBy

export const getByTestId = testIdQueries.getBy
export const getAllByTestId = testIdQueries.getAllBy
export const queryByTestId = testIdQueries.queryBy
export const queryAllByTestId = testIdQueries.queryAllBy
export const findByTestId = testIdQueries.findBy
export const findAllByTestId = testIdQueries.findAllBy

export const getByLabelText = labelTextQueries.getBy
export const getAllByLabelText = labelTextQueries.getAllBy
export const queryByLabelText = labelTextQueries.queryBy
export const queryAllByLabelText = labelTextQueries.queryAllBy
export const findByLabelText = labelTextQueries.findBy
export const findAllByLabelText = labelTextQueries.findAllBy

// ----- Bound Queries -----

export interface BoundQueries {
  getByText: (text: TextMatch, options?: QueryOptions) => HTMLElement
  getAllByText: (text: TextMatch, options?: QueryOptions) => Array<HTMLElement>
  queryByText: (text: TextMatch, options?: QueryOptions) => HTMLElement | null
  queryAllByText: (text: TextMatch, options?: QueryOptions) => Array<HTMLElement>
  findByText: (text: TextMatch, options?: QueryOptions) => Promise<HTMLElement>
  findAllByText: (text: TextMatch, options?: QueryOptions) => Promise<Array<HTMLElement>>

  getByRole: (role: string, options?: ByRoleOptions) => HTMLElement
  getAllByRole: (role: string, options?: ByRoleOptions) => Array<HTMLElement>
  queryByRole: (role: string, options?: ByRoleOptions) => HTMLElement | null
  queryAllByRole: (role: string, options?: ByRoleOptions) => Array<HTMLElement>
  findByRole: (role: string, options?: ByRoleOptions) => Promise<HTMLElement>
  findAllByRole: (role: string, options?: ByRoleOptions) => Promise<Array<HTMLElement>>

  getByTestId: (testId: TextMatch, options?: QueryOptions) => HTMLElement
  getAllByTestId: (testId: TextMatch, options?: QueryOptions) => Array<HTMLElement>
  queryByTestId: (testId: TextMatch, options?: QueryOptions) => HTMLElement | null
  queryAllByTestId: (testId: TextMatch, options?: QueryOptions) => Array<HTMLElement>
  findByTestId: (testId: TextMatch, options?: QueryOptions) => Promise<HTMLElement>
  findAllByTestId: (testId: TextMatch, options?: QueryOptions) => Promise<Array<HTMLElement>>

  getByLabelText: (text: TextMatch, options?: QueryOptions) => HTMLElement
  getAllByLabelText: (text: TextMatch, options?: QueryOptions) => Array<HTMLElement>
  queryByLabelText: (text: TextMatch, options?: QueryOptions) => HTMLElement | null
  queryAllByLabelText: (text: TextMatch, options?: QueryOptions) => Array<HTMLElement>
  findByLabelText: (text: TextMatch, options?: QueryOptions) => Promise<HTMLElement>
  findAllByLabelText: (text: TextMatch, options?: QueryOptions) => Promise<Array<HTMLElement>>
}

export function getQueriesForElement(element: HTMLElement): BoundQueries {
  return {
    getByText: (text, options) => getByText(element, text, options),
    getAllByText: (text, options) => getAllByText(element, text, options),
    queryByText: (text, options) => queryByText(element, text, options),
    queryAllByText: (text, options) => queryAllByText(element, text, options),
    findByText: (text, options) => findByText(element, text, options),
    findAllByText: (text, options) => findAllByText(element, text, options),

    getByRole: (role, options) => getByRole(element, role, options),
    getAllByRole: (role, options) => getAllByRole(element, role, options),
    queryByRole: (role, options) => queryByRole(element, role, options),
    queryAllByRole: (role, options) => queryAllByRole(element, role, options),
    findByRole: (role, options) => findByRole(element, role, options),
    findAllByRole: (role, options) => findAllByRole(element, role, options),

    getByTestId: (testId, options) => getByTestId(element, testId, options),
    getAllByTestId: (testId, options) => getAllByTestId(element, testId, options),
    queryByTestId: (testId, options) => queryByTestId(element, testId, options),
    queryAllByTestId: (testId, options) => queryAllByTestId(element, testId, options),
    findByTestId: (testId, options) => findByTestId(element, testId, options),
    findAllByTestId: (testId, options) => findAllByTestId(element, testId, options),

    getByLabelText: (text, options) => getByLabelText(element, text, options),
    getAllByLabelText: (text, options) => getAllByLabelText(element, text, options),
    queryByLabelText: (text, options) => queryByLabelText(element, text, options),
    queryAllByLabelText: (text, options) => queryAllByLabelText(element, text, options),
    findByLabelText: (text, options) => findByLabelText(element, text, options),
    findAllByLabelText: (text, options) => findAllByLabelText(element, text, options)
  }
}

export { waitFor }
