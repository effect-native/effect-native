# @effect-native/opentui-base — Requirements

This document defines atomic, testable requirements using EARS notation.

All requirements derive from **VT-HIG (Virtual Terminal Human Interface Guidelines)** and **Base UI API patterns**.

---

## Selection List Requirements

These requirements define a primitive for navigable, selectable lists.

### FR-SL-001: Single Selection Mode

The selection list primitive shall support single-selection mode where only one item can be selected at a time.

### FR-SL-002: Multi-Selection Mode

**Where** multi-selection is enabled\
**Then** the selection list primitive shall allow multiple items to be selected simultaneously.

### FR-SL-003: Controlled Value

**When** a controlled value is provided\
**Then** the selection list primitive shall use that value as the source of truth for selection.

### FR-SL-004: Uncontrolled Default Value

**When** only a default value is provided\
**Then** the selection list primitive shall initialize selection to that value and manage state internally.

### FR-SL-005: Value Change Callback

**When** the selection changes\
**Then** the selection list primitive shall invoke a value change callback with the new value and event details.

### FR-SL-006: Keyboard Navigation (Down)

**When** the user presses Arrow Down or `j`\
**Then** the selection list shall move highlight to the next enabled item.

### FR-SL-007: Keyboard Navigation (Up)

**When** the user presses Arrow Up or `k`\
**Then** the selection list shall move highlight to the previous enabled item.

### FR-SL-008: Keyboard Selection (Enter)

**When** the user presses Enter on a highlighted item\
**Then** the selection list shall select that item.

### FR-SL-009: Keyboard Selection (Space)

**When** the user presses Space on a highlighted item\
**Then** the selection list shall toggle that item's selection (in multi-select mode) or select it (in single-select mode).

### FR-SL-010: Home/End Navigation

**When** the user presses Home\
**Then** the selection list shall move highlight to the first enabled item.

**When** the user presses End\
**Then** the selection list shall move highlight to the last enabled item.

### FR-SL-011: Type-Ahead Navigation

**When** the user types alphanumeric characters\
**Then** the selection list shall move highlight to the first item whose label starts with the typed string.

### FR-SL-012: Disabled Item Skipping

**While** navigating via keyboard\
**Then** the selection list shall skip disabled items.

### FR-SL-013: Mouse Click Selection

**When** the user clicks on an enabled item\
**Then** the selection list shall select that item.

### FR-SL-014: Highlight State Exposure

The selection list shall expose highlight state for each item to enable styling.

### FR-SL-015: Selected State Exposure

The selection list shall expose selected state for each item to enable styling.

### FR-SL-016: Disabled State Exposure

The selection list shall expose disabled state for each item to enable styling.

### FR-SL-017: Scroll Into View

**When** highlight moves to an item outside the visible viewport\
**Then** the selection list shall scroll to make that item visible.

### FR-SL-018: Loop Navigation

**Where** loop navigation is enabled\
**When** navigating past the last item\
**Then** the selection list shall wrap to the first item (and vice versa).

### FR-SL-019: Item Identity

Each item in the selection list shall have a unique identifier for selection tracking.

### FR-SL-020: Focus Integration

**While** the selection list does not have focus\
**Then** the selection list shall ignore keyboard input (except Tab navigation).

---

## Menu Requirements

These requirements define a primitive for context menus and dropdown menus.

### FR-MN-001: Open State Control

The menu primitive shall support controlled and uncontrolled open state.

### FR-MN-002: Trigger Activation

**When** the user activates a trigger element (Enter, Space, or click)\
**Then** the menu shall open.

### FR-MN-003: Keyboard Navigation (Down)

**When** the menu is open and the user presses Arrow Down or `j`\
**Then** the menu shall move highlight to the next enabled item.

### FR-MN-004: Keyboard Navigation (Up)

**When** the menu is open and the user presses Arrow Up or `k`\
**Then** the menu shall move highlight to the previous enabled item.

### FR-MN-005: Item Selection

**When** the user presses Enter on a highlighted item\
**Then** the menu shall invoke a selection callback for that item and close.

### FR-MN-006: Shortcut Key Selection

**When** the user presses a key matching an item's shortcut\
**Then** the menu shall select that item and close.

### FR-MN-007: Escape Closes Menu

**When** the user presses Escape\
**Then** the menu shall close without selection.

### FR-MN-008: Disabled Item Skipping

**While** navigating menu items\
**Then** the menu shall skip disabled items.

### FR-MN-009: Mouse Click Selection

**When** the user clicks on an enabled item\
**Then** the menu shall select that item and close.

### FR-MN-010: Checkbox Item Toggle

**When** the user selects a checkbox-style item\
**Then** the menu shall toggle its checked state and invoke a change callback.

### FR-MN-011: Radio Item Selection

**When** the user selects a radio-style item within a group\
**Then** the group shall update its value and invoke a change callback.

### FR-MN-012: Submenu Arrow Navigation

**When** the user presses Arrow Right or `l` on a submenu trigger\
**Then** the menu shall open the submenu and move highlight to its first item.

### FR-MN-013: Submenu Back Navigation

**When** the user presses Arrow Left or `h` inside a submenu\
**Then** the menu shall close the submenu and return highlight to the parent trigger.

### FR-MN-014: Initial Highlight

**When** the menu opens\
**Then** the menu shall highlight the first enabled item.

### FR-MN-015: Type-Ahead Navigation

**When** the user types alphanumeric characters while menu is open\
**Then** the menu shall move highlight to the first matching item.

### FR-MN-016: Open Change Callback

**When** the menu opens or closes\
**Then** the menu shall invoke an open change callback with the new state.

---

## Dialog Requirements

These requirements define a primitive for modal and non-modal dialogs.

### FR-DG-001: Open State Control

The dialog primitive shall support controlled and uncontrolled open state.

### FR-DG-002: Trigger Activation

**When** the user activates a trigger element\
**Then** the dialog shall open.

### FR-DG-003: Modal Focus Trap

**While** the dialog is open in modal mode\
**Then** Tab/Shift+Tab shall cycle only through focusable elements within the dialog content.

### FR-DG-004: Escape Closes Dialog

**When** the user presses Escape\
**Then** the dialog shall close.

### FR-DG-005: Close Element

**When** the user activates a close element within the dialog\
**Then** the dialog shall close.

### FR-DG-006: Initial Focus

**When** the dialog opens\
**Then** focus shall move to the first focusable element within the dialog content (or a designated initial focus element).

### FR-DG-007: Return Focus

**When** the dialog closes\
**Then** focus shall return to the element that triggered the dialog.

### FR-DG-008: Backdrop Interaction

**Where** backdrop click close is enabled\
**When** the user clicks the backdrop area\
**Then** the dialog shall close.

### FR-DG-009: Open Change Callback

**When** the dialog opens or closes\
**Then** the dialog shall invoke an open change callback with the new state.

### FR-DG-010: Non-Modal Mode

**Where** the dialog is in non-modal mode\
**Then** the dialog shall not trap focus or block interaction with other elements.

### FR-DG-011: Title Association

The dialog content shall support association with a title element for accessibility.

---

## Search Input Requirements

These requirements define a primitive for search/filtering with async result loading.

### FR-SI-001: Input Value State

The search input primitive shall manage input value with controlled and uncontrolled modes.

### FR-SI-002: Selection Value State

The search input primitive shall manage selection with controlled and uncontrolled modes.

### FR-SI-003: Filter Function

The search input primitive shall accept a filter function to determine which items match the input.

### FR-SI-004: Open on Input

**When** the user types in the search input\
**Then** the results list shall open (unless disabled).

### FR-SI-005: Keyboard Navigation

**When** the results list is open and the user presses Arrow Down/Up\
**Then** the search input shall navigate through filtered items.

### FR-SI-006: Item Selection (Enter)

**When** the user presses Enter on a highlighted item\
**Then** the search input shall select that item, update the input, and close the results list.

### FR-SI-007: Escape Closes

**When** the user presses Escape\
**Then** the search input shall close without selection.

### FR-SI-008: Input Value Change Callback

**When** the input value changes\
**Then** the search input shall invoke an input value change callback.

### FR-SI-009: Selection Change Callback

**When** the selection changes\
**Then** the search input shall invoke a selection change callback.

### FR-SI-010: Loading State

The search input primitive shall support indicating async data fetching state.

### FR-SI-011: Empty State

**While** no items match the current filter\
**Then** the search input shall support rendering an empty state.

### FR-SI-012: Debounced Input

**Where** debounce is configured\
**Then** the search input shall debounce input changes before filtering/callbacks.

### FR-SI-013: Mouse Click Selection

**When** the user clicks on an enabled item\
**Then** the search input shall select that item.

---

## Scroll Viewport Requirements

These requirements define a primitive for viewport scrolling management.

### FR-SV-001: Vertical Scroll

**When** content height exceeds viewport height\
**Then** the scroll viewport shall enable vertical scrolling.

### FR-SV-002: Horizontal Scroll

**Where** horizontal scrolling is enabled\
**When** content width exceeds viewport width\
**Then** the scroll viewport shall enable horizontal scrolling.

### FR-SV-003: Keyboard Scroll

**When** the user presses Arrow Up/Down\
**Then** the scroll viewport shall scroll vertically by one line.

**When** the user presses Page Up/Page Down\
**Then** the scroll viewport shall scroll by one viewport height.

### FR-SV-004: Scroll Position Callback

**When** scroll position changes\
**Then** the scroll viewport shall invoke a scroll callback with current position.

### FR-SV-005: Programmatic Scroll

The scroll viewport shall support programmatic scrolling to a specific position.

### FR-SV-006: Scroll Into View

The scroll viewport shall support scrolling a specific element into view.

### FR-SV-007: Mouse Wheel Scroll

**When** the user uses mouse wheel over the viewport\
**Then** the scroll viewport shall scroll in the wheel direction.

---

## Separator Requirements

These requirements define a primitive for visual dividers.

### FR-SP-001: Horizontal Orientation

The separator shall render as a horizontal divider by default.

### FR-SP-002: Vertical Orientation

**Where** vertical orientation is specified\
**Then** the separator shall render as a vertical divider.

### FR-SP-003: Decorative Mode

The separator shall support decorative mode (not announced by assistive technology) by default.

### FR-SP-004: Semantic Mode

**Where** semantic mode is enabled\
**Then** the separator shall have semantic separator role.

---

## Focus Management Requirements

These requirements define how keyboard focus is managed across the TUI application. Since OpenTUI does not provide a native focus system like the browser DOM, these requirements establish the expected behavior that primitives must support.

### FR-FM-001: Focus State

The focus system shall track which element currently has focus within the application.

### FR-FM-002: Single Focus

Only one focusable element shall be focused at any given time.

### FR-FM-003: Tab Navigation

**When** the user presses Tab\
**Then** focus shall move to the next focusable element in tab order.

### FR-FM-004: Shift-Tab Navigation

**When** the user presses Shift+Tab\
**Then** focus shall move to the previous focusable element in tab order.

### FR-FM-005: Focus Indication

The focus system shall expose which element is currently focused to enable visual indication.

### FR-FM-006: Keyboard Event Routing

**While** an element has focus\
**Then** keyboard events (other than Tab/Shift+Tab) shall be routed only to that element.

### FR-FM-007: Focusable Registration

Focusable elements shall register themselves with the focus system when mounted and unregister when unmounted.

### FR-FM-008: Programmatic Focus

The focus system shall support programmatically moving focus to a specific element.

### FR-FM-009: Focus on Mount

Focusable elements shall support an option to automatically request focus when mounted.

### FR-FM-010: Tab Order

The focus system shall determine tab order based on element position in the component tree (or explicit tab index if provided).

### FR-FM-011: Disabled Elements

**While** an element is disabled\
**Then** it shall be skipped during tab navigation and shall not receive keyboard events.

### FR-FM-012: Focus Trap Scope

Modal components (dialogs) shall be able to trap focus within their content, preventing Tab from escaping.

### FR-FM-013: Focus Restoration

**When** a focus trap is released (e.g., dialog closes)\
**Then** focus shall return to the element that was focused before the trap.

### FR-FM-014: Mouse Click Focus

**When** the user clicks on a focusable element\
**Then** that element shall receive focus.

### FR-FM-015: Active vs Focused

The focus system shall distinguish between "focused" (has keyboard focus) and "active" (can receive events) — an element may be active without being focused when focus management is delegated.

---

## Event Propagation Requirements

These requirements define how keyboard and mouse events propagate through the component tree, similar to DOM event bubbling/capturing.

### FR-EP-001: Bubble Phase

**When** a focused element does not handle a keyboard event\
**Then** the event shall propagate to its parent, then grandparent, and so on up the tree until handled or reaching the root.

### FR-EP-002: Capture Phase

The event system shall support a capture phase where ancestors can intercept events before they reach the target element.

### FR-EP-003: Stop Propagation

Event handlers shall be able to call `stopPropagation()` to prevent further bubbling to ancestors.

### FR-EP-004: Prevent Default

Event handlers shall be able to call `preventDefault()` to prevent the default behavior associated with an event.

### FR-EP-005: Event Handled Flag

The event system shall track whether an event has been handled, allowing ancestors to check if a descendant already processed it.

### FR-EP-006: Mouse Event Propagation

Mouse events (click, wheel) shall follow the same bubble/capture propagation model as keyboard events.

### FR-EP-007: Default Propagation Order

Events shall propagate in capture phase (root to target) then bubble phase (target to root) by default.

### FR-EP-008: Handler Registration

Components shall be able to register handlers for either capture phase or bubble phase (bubble by default).

### FR-EP-009: Propagation Through Focus Boundaries

**While** a focus trap is active\
**Then** events shall still propagate within the trapped scope but not escape to elements outside.

### FR-EP-010: Event Target

Each event shall include a reference to the original target element that received the event.

---

## Shared Primitive Requirements

### FR-SH-001: Custom Rendering

All primitives shall support custom rendering via render props or similar patterns.

### FR-SH-002: Ref Access

All primitives shall provide access to underlying element refs.

### FR-SH-003: State Exposure

All primitives shall expose internal state for styling purposes.

### FR-SH-004: Element Customization

All primitives shall support customizing the rendered element type.

### FR-SH-005: Event Details

All event callbacks shall receive event details including reason and cancellation support.

### FR-SH-006: Focus Integration

All interactive primitives shall integrate with the focus system for keyboard event routing.

---

## Non-Functional Requirements

### NFR-001: Keyboard-First

All primitives shall be fully operable via keyboard alone.

### NFR-002: Mouse Support

All interactive primitives shall respond to mouse events.

### NFR-003: VT-HIG Compliance

All primitives shall follow VT-HIG keyboard contracts and interaction patterns.

### NFR-004: No Visual Styling

Primitives shall not impose any visual styling (borders, colors, spacing).

### NFR-005: TypeScript Types

All exports shall include comprehensive TypeScript types.

### NFR-006: Tree-Shakeable

The package shall be tree-shakeable, allowing unused primitives to be excluded from bundles.

### NFR-007: OpenTUI Compatibility

Primitives shall work with OpenTUI's rendering model without browser-specific DOM APIs.

---

## Constraints

### CON-001: React Dependency

Primitives require React 18+.

### CON-002: OpenTUI Dependency

Primitives require @opentui/react for rendering.

### CON-003: No forwardRef

Primitives shall use React 19's ref-as-prop pattern, not forwardRef.

### CON-004: Effect-TS Optional

Primitives shall work without Effect-TS for basic usage; Effect integration is optional.
