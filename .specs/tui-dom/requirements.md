# Requirements: TUI DOM

## 1. Functional Requirements (FR)

### Slice 1: Read + Exit (Static Rendering)
**Goal:** Enable CLI tools to output rich, styled text from HTML/Markdown sources to stdout.

*   **FR-1.1 (Input):** The System shall accept HTML content via standard input (stdin) or a file path argument.
*   **FR-1.2 (Markdown Support):** Where the input is Markdown, the System shall convert it to HTML structure before rendering.
*   **FR-1.3 (Rendering):** The System shall render the DOM tree to standard output (stdout) using ANSI escape sequences for styling (colors, bold, underline).
*   **FR-1.4 (Layout):** The System shall map block-level elements (`div`, `p`, `h1`) to vertical layout structures and inline elements (`span`, `a`, `strong`) to styled text runs.
*   **FR-1.5 (Lifecycle):** The System shall exit the process immediately after rendering the initial frame to stdout.

### Slice 2: Interactive (App Runtime)
**Goal:** Enable persistent, interactive TUI applications using standard DOM APIs.

*   **FR-2.1 (Persistence):** The System shall maintain a persistent process and take control of the terminal screen (alternate buffer) when in interactive mode.
*   **FR-2.2 (Reactivity):** When the DOM changes (detected via MutationObserver), the System shall re-render the corresponding TUI components.
*   **FR-2.3 (Viewport):** When the terminal window is resized, the System shall update the `window` dimensions and trigger a re-render.
*   **FR-2.4 (Scrolling):** The System shall provide full-page scrolling by default when content exceeds the viewport height.
*   **FR-2.5 (Scroll Regions):** Where an element has `overflow: scroll` (or equivalent style), the System shall create a nested scrollable region instead of scrolling the entire page.
*   **FR-2.6 (Focus Management):** When the user presses Tab or Shift+Tab, the System shall move focus between interactive elements following DOM order and `tabindex`.
*   **FR-2.7 (Scroll-to-Focus):** When an element receives focus, the System shall automatically scroll the viewport (or parent scroll container) to make that element visible.
*   **FR-2.8 (Form Controls):** The System shall render and handle input for standard HTML form elements:
    *   `input[type="text"]` (text entry)
    *   `button` (activation via Enter/Space)
    *   `select` (dropdown/listbox navigation)
    *   `input[type="checkbox"]` (toggle)
    *   `input[type="radio"]` (exclusive selection)
*   **FR-2.9 (Event Propagation):** The System shall implement standard DOM event bubbling and capturing for synthetic events generated from TUI input (e.g., `click`, `keydown`, `focus`, `blur`).
*   **FR-2.10 (Focus Trapping):** The System shall support focus trapping (e.g., for modal dialogs) where focus navigation is constrained to a specific DOM subtree.

### Slice 3: Styling (Tailwind Support)
**Goal:** Enable styling via standard CSS utility classes.

*   **FR-3.1 (Class Mapping):** The System shall map Tailwind CSS classes to OpenTUI style properties (e.g., `bg-red-500` → ANSI red background, `flex-col` → Yoga `flexDirection: column`).
*   **FR-3.2 (Graceful Degradation):** If a CSS class or property has no TUI equivalent (e.g., `box-shadow`, `z-index` layering nuances), the System shall ignore it without crashing.
*   **FR-3.3 (Theme Mapping):** The System shall resolve CSS variables (e.g., `--primary`, `--foreground`) to specific ANSI colors based on the active theme configuration.

## 2. Non-Functional Requirements (NFR)

*   **NFR-1 (Performance):** The System shall process DOM mutations and render the TUI frame within 16ms (60fps) for typical updates.
*   **NFR-2 (Compatibility):** The System shall function correctly in standard terminal emulators (xterm-256color compliant).
*   **NFR-3 (Accessibility):** The System shall produce output compatible with screen readers by maintaining a linear text buffer representation where possible.

## 3. Constraints

*   **C-1 (Not a Browser):** The System shall **not** attempt to implement a full web browser engine (no complex CSS grid, floats, or legacy quirks mode). It targets "App" layouts (Flexbox/Yoga).
*   **C-2 (Idiomatic UX):** The System shall prioritize VT-HIG (Virtual Terminal Human Interface Guidelines) over browser behaviors where they conflict (e.g., using arrow keys for list navigation instead of requiring a mouse).
*   **C-3 (Tech Stack):** The System shall use `happy-dom` for the DOM implementation and `opentui` for the rendering engine.
