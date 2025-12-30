import { describe, it, expect, beforeAll, afterEach } from "vitest"
import React from "react"
import { setupHappyDom, render, cleanup } from "../src/index.js"

// Setup happy-dom before all tests
beforeAll(() => {
  setupHappyDom()
})

// Clean up after each test
afterEach(() => {
  cleanup()
  // Also clear body content explicitly
  document.body.innerHTML = ""
})

describe("render()", () => {
  it("mounts a React component and returns the container", () => {
    const { container } = render(<div data-testid="test">Hello</div>)

    expect(container).toBeDefined()
    expect(container.innerHTML).toContain("Hello")
  })

  it("returns bound query methods", () => {
    const { getByText, getByTestId } = render(
      <div>
        <span data-testid="greeting">Hello World</span>
      </div>
    )

    expect(getByText("Hello World")).toBeDefined()
    expect(getByTestId("greeting")).toBeDefined()
  })

  it("unmounts the component when unmount() is called", () => {
    const { container, unmount } = render(<div>Mounted</div>)

    expect(container.innerHTML).toContain("Mounted")
    unmount()
    expect(container.innerHTML).toBe("")
  })

  it("rerenders the component with new props", () => {
    const { container, rerender } = render(<div>Version 1</div>)

    expect(container.innerHTML).toContain("Version 1")

    rerender(<div>Version 2</div>)
    expect(container.innerHTML).toContain("Version 2")
    expect(container.innerHTML).not.toContain("Version 1")
  })

  it("supports custom wrapper components", () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="wrapper">{children}</div>
    )

    const { container } = render(<span>Content</span>, { wrapper: Wrapper })

    expect(container.querySelector('[data-testid="wrapper"]')).toBeDefined()
    expect(container.innerHTML).toContain("Content")
  })

  it("returns asFragment() that clones the container content", () => {
    const { asFragment, container } = render(
      <div>
        <span>Item 1</span>
        <span>Item 2</span>
      </div>
    )

    const fragment = asFragment()
    expect(fragment.childNodes.length).toBeGreaterThan(0)

    // Modifying fragment does not affect original
    container.innerHTML = "Changed"
    expect(fragment.textContent).toContain("Item 1")
  })
})

describe("screen queries", () => {
  it("queries document.body after render", () => {
    const { getByRole } = render(<button>Click Me</button>)

    const button = getByRole("button", { name: "Click Me" })
    expect(button).toBeDefined()
    expect(button.textContent).toBe("Click Me")
  })

  it("throws when element is not found using getBy", () => {
    const { getByText } = render(<div>Nothing here</div>)

    expect(() => getByText("Not Found")).toThrow(/Unable to find/)
  })

  it("returns null with queryBy when element is not found", () => {
    const { queryByText } = render(<div>Nothing here</div>)

    expect(queryByText("Not Found")).toBeNull()
  })
})

describe("cleanup()", () => {
  it("removes all mounted components from the document", () => {
    render(<div>Component 1</div>)
    render(<div>Component 2</div>)

    expect(document.body.innerHTML).toContain("Component 1")
    expect(document.body.innerHTML).toContain("Component 2")

    cleanup()

    expect(document.body.innerHTML).not.toContain("Component 1")
    expect(document.body.innerHTML).not.toContain("Component 2")
  })
})

describe("text queries", () => {
  it("finds element by exact text", () => {
    const { getByText } = render(<p>Hello World</p>)
    expect(getByText("Hello World")).toBeDefined()
  })

  it("finds element by regex", () => {
    const { getByText } = render(<p>Unique Greeting 123</p>)
    expect(getByText(/Unique/)).toBeDefined()
  })

  it("supports exact: false for substring match", () => {
    const { getByText } = render(<p>Unique Hello World</p>)
    expect(getByText("unique", { exact: false })).toBeDefined()
  })
})

describe("role queries", () => {
  it("finds button by role", () => {
    const { getByRole } = render(<button>Submit</button>)
    expect(getByRole("button")).toBeDefined()
  })

  it("finds button by role and name", () => {
    const { getByRole } = render(
      <div>
        <button>Save</button>
        <button>Cancel</button>
      </div>
    )
    expect(getByRole("button", { name: "Save" })).toBeDefined()
  })

  it("finds heading by role and level", () => {
    const { getByRole } = render(<h2>Section Title</h2>)
    expect(getByRole("heading", { level: 2 })).toBeDefined()
  })
})

describe("testId queries", () => {
  it("finds element by data-testid attribute", () => {
    const { getByTestId } = render(<div data-testid="my-element">Content</div>)
    expect(getByTestId("my-element")).toBeDefined()
  })
})

describe("labelText queries", () => {
  it("finds input by associated label", () => {
    const { getByLabelText } = render(
      <div>
        <label htmlFor="email">Email Address</label>
        <input id="email" type="email" />
      </div>
    )
    expect(getByLabelText("Email Address")).toBeDefined()
  })

  it("finds element by aria-label", () => {
    const { getByLabelText } = render(<button aria-label="Close dialog">X</button>)
    expect(getByLabelText("Close dialog")).toBeDefined()
  })
})

describe("getAllBy queries", () => {
  it("returns all matching elements", () => {
    const { getAllByRole } = render(
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    )
    const items = getAllByRole("listitem")
    expect(items).toHaveLength(3)
  })

  it("throws when no elements found", () => {
    const { getAllByRole } = render(<div>Empty</div>)
    expect(() => getAllByRole("button")).toThrow(/Unable to find/)
  })
})

describe("queryAllBy queries", () => {
  it("returns empty array when no elements found", () => {
    const { queryAllByRole } = render(<div>Empty</div>)
    expect(queryAllByRole("button")).toEqual([])
  })
})

describe("findBy queries (async)", () => {
  it("finds an element that is already present", async () => {
    // Test that findBy works on elements already in the DOM
    const { findByTestId } = render(<div data-testid="present">Here!</div>)
    const element = await findByTestId("present", { timeout: 100 })
    expect(element).toBeDefined()
    expect(element.textContent).toBe("Here!")
  })

  it("times out when element never appears", async () => {
    const { findByTestId } = render(<div>No testid here</div>)

    await expect(findByTestId("nonexistent", { timeout: 100 })).rejects.toThrow(
      /Unable to find element/
    )
  })
})
