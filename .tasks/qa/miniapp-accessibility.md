---
title: "QA: TUI Miniapp Accessibility"
status: pending
assigned_to: Bramwell
blocked_by:
  - .tasks/GOAL-tui-miniapp.md
done_when: |
  Bramwell has verified:
  - All elements are keyboard accessible (no mouse required)
  - Focus order is logical
  - Accesskeys work
  - Dialog focus trap works correctly
  - Screen reader would understand structure (semantic HTML)
  Evidence: written confirmation of each check
---

# QA: TUI Miniapp Accessibility

Bramwell, please verify the miniapp is fully accessible via keyboard.

## Steps

### Full Keyboard Navigation Test
1. Launch miniapp: `cd packages-native/opentui-dom && pnpm tui-dom`
2. Starting from the top, press Tab repeatedly
3. Count how many Tab presses to reach the last focusable element
4. Press Shift+Tab to go backwards
5. Verify you can reach ALL interactive elements via Tab

### Accesskey Test
6. Press Alt+N - should focus Name input
7. Press Alt+E - should focus Email input
8. Press Alt+D - should open Dialog
9. Press Alt+S - should submit form
10. Press Alt+R - should reset form

### Radio Group Navigation
11. Tab to the radio group
12. Press Arrow Down/Right - should select next option
13. Press Arrow Up/Left - should select previous option
14. Verify only one radio is selected at a time

### Select/Dropdown Navigation
15. Tab to the select dropdown
16. Press Arrow Down to open/navigate options
17. Press Enter to select
18. Press Escape to close without selecting

### Dialog Focus Trap
19. Open dialog (Alt+D or click)
20. Press Tab repeatedly
21. Verify focus stays INSIDE the dialog (doesn't escape)
22. Press Escape to close
23. Verify focus returns to the element that opened the dialog

### Form Submission via Keyboard
24. Fill out form using only keyboard
25. Press Enter or Alt+S to submit
26. Verify submission works

## Expected Outcome

- Every interactive element is reachable via Tab
- Focus order follows visual order (top-to-bottom, left-to-right)
- All accesskeys work
- Radio groups use arrow keys correctly
- Dialog traps focus until dismissed
- Form can be fully completed without mouse

## Context

High-Level Goal: Ensure TUI apps built with this system are accessible
Motivation: TUI apps are often used in environments where mouse isn't available
Obstacle: Accessibility requires human testing of keyboard flows

## Response Options

- Reject – reason (e.g., "Can't Tab to the Submit button")
- Pass – written confirmation that all checks passed
- Pass with issues – confirmation + list of accessibility gaps found
