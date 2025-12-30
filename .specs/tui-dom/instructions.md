# Instructions: TUI DOM

## Context
We are building a bridge between the DOM and Terminal User Interfaces (TUI). Currently, TUI development requires specialized knowledge of low-level VT standards or specific TUI frameworks. We want to enable developers to build TUI applications using standard Web technologies: HTML, CSS (Tailwind), and React components (specifically shadcn/ui).

We have a proof-of-concept (`tui-dom-poc0`) that demonstrates this is possible using `happy-dom` as a virtual DOM, `opentui` as the rendering engine, and a bridge layer that synchronizes them. We now need to extract this logic into a reusable package `@effect-native/opentui-dom` and validate it with a comprehensive "miniapp".

## User Story
As a React developer, I want to render my existing web components (like shadcn/ui) to the terminal, so that I can build CLI tools and TUI applications without learning a new UI paradigm.

## High-Level Goals
1.  **Package Extraction**: Extract the core bridging logic from `tui-dom-poc0` into a standalone package `@effect-native/opentui-dom`. This includes:
    *   **DOM Adapter**: Abstracting `happy-dom` (fast/local) and `puppeteer` (real browser).
    *   **Style Bridge**: Mapping Tailwind/CSS to TUI/Yoga layouts and ANSI styling.
    *   **Event Relay**: Translating TUI keyboard events to DOM events (`click`, `input`, `focus`, `keydown`) respecting VT-HIG and WAI-ARIA.
    *   **Theme Map**: Automatically mapping shadcn CSS variables to terminal-compatible ANSI colors.
2.  **Testing Library**: Create `@effect-native/opentui-dom-testing-library` to enable standard `@testing-library` patterns (`render`, `screen`, `fireEvent`) for TUI apps.
3.  **Validation (The Miniapp)**: Create a standalone `miniapp.html` that uses these packages to render a functional application in the terminal.
    *   Must support mouse and keyboard navigation.
    *   Must support form elements, dialogs, and buttons.
    *   Must respect Tailwind classes and layout.
    *   Must be accessible regardless of viewport size.

## Out of Scope
*   Building a full-featured general-purpose web browser (we are building a runtime for specific apps).
*   Supporting legacy browser quirks or non-standard HTML.
*   Complete CSS support (we focus on Flexbox/Yoga compatible properties used by Tailwind).
