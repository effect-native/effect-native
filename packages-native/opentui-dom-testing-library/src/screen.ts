/**
 * Screen convenience object for querying document.body.
 * Similar to @testing-library's screen export.
 */

import * as queries from "./queries.js"
import { ensureHappyDom } from "./setup.js"

// Lazy getter that returns queries bound to document.body
function getScreen() {
  ensureHappyDom()
  const body = globalThis.document?.body
  if (!body) {
    throw new Error("screen is not available. Make sure document.body exists.")
  }
  return {
    // getBy
    getByText: (text: queries.TextMatch, opts?: queries.QueryOptions) => queries.getByText(body, text, opts),
    getByRole: (role: string, opts?: queries.ByRoleOptions) => queries.getByRole(body, role, opts),
    getByTestId: (id: queries.TextMatch, opts?: queries.QueryOptions) => queries.getByTestId(body, id, opts),
    getByLabelText: (text: queries.TextMatch, opts?: queries.QueryOptions) => queries.getByLabelText(body, text, opts),
    // getAllBy
    getAllByText: (text: queries.TextMatch, opts?: queries.QueryOptions) => queries.getAllByText(body, text, opts),
    getAllByRole: (role: string, opts?: queries.ByRoleOptions) => queries.getAllByRole(body, role, opts),
    getAllByTestId: (id: queries.TextMatch, opts?: queries.QueryOptions) => queries.getAllByTestId(body, id, opts),
    getAllByLabelText: (text: queries.TextMatch, opts?: queries.QueryOptions) =>
      queries.getAllByLabelText(body, text, opts),
    // queryBy
    queryByText: (text: queries.TextMatch, opts?: queries.QueryOptions) => queries.queryByText(body, text, opts),
    queryByRole: (role: string, opts?: queries.ByRoleOptions) => queries.queryByRole(body, role, opts),
    queryByTestId: (id: queries.TextMatch, opts?: queries.QueryOptions) => queries.queryByTestId(body, id, opts),
    queryByLabelText: (text: queries.TextMatch, opts?: queries.QueryOptions) =>
      queries.queryByLabelText(body, text, opts),
    // queryAllBy
    queryAllByText: (text: queries.TextMatch, opts?: queries.QueryOptions) => queries.queryAllByText(body, text, opts),
    queryAllByRole: (role: string, opts?: queries.ByRoleOptions) => queries.queryAllByRole(body, role, opts),
    queryAllByTestId: (id: queries.TextMatch, opts?: queries.QueryOptions) => queries.queryAllByTestId(body, id, opts),
    queryAllByLabelText: (text: queries.TextMatch, opts?: queries.QueryOptions) =>
      queries.queryAllByLabelText(body, text, opts),
    // findBy
    findByText: (text: queries.TextMatch, opts?: queries.QueryOptions) => queries.findByText(body, text, opts),
    findByRole: (role: string, opts?: queries.ByRoleOptions) => queries.findByRole(body, role, opts),
    findByTestId: (id: queries.TextMatch, opts?: queries.QueryOptions) => queries.findByTestId(body, id, opts),
    findByLabelText: (text: queries.TextMatch, opts?: queries.QueryOptions) =>
      queries.findByLabelText(body, text, opts),
    // findAllBy
    findAllByText: (text: queries.TextMatch, opts?: queries.QueryOptions) => queries.findAllByText(body, text, opts),
    findAllByRole: (role: string, opts?: queries.ByRoleOptions) => queries.findAllByRole(body, role, opts),
    findAllByTestId: (id: queries.TextMatch, opts?: queries.QueryOptions) => queries.findAllByTestId(body, id, opts),
    findAllByLabelText: (text: queries.TextMatch, opts?: queries.QueryOptions) =>
      queries.findAllByLabelText(body, text, opts),
    // Utilities
    debug: (element?: HTMLElement) => {
      console.log((element ?? body).outerHTML)
    }
  }
}

// Proxy that lazily creates screen on first access
export const screen = new Proxy({} as ReturnType<typeof getScreen>, {
  get(_, prop) {
    return getScreen()[prop as keyof ReturnType<typeof getScreen>]
  }
})
