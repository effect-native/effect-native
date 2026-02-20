---
title: "QA: TUI Miniapp Interactive Test"
status: pending
assigned_to: Bramwell
blocked_by:
  - .tasks/GOAL-tui-miniapp.md
done_when: |
  Bramwell has verified:
  - Miniapp launches in terminal
  - All form elements are visible and interactive
  - Keyboard navigation works (Tab, Shift+Tab, Arrow keys)
  - Mouse clicks work
  - Dialog opens and closes
  - Form submission works
  Evidence: screenshot or screen recording of the miniapp running
---

# QA: TUI Miniapp Interactive Test

Bramwell, please manually test the TUI miniapp to verify it works interactively.

## Steps

1. Open terminal (make it reasonably sized, ~120x40 or larger)
2. Navigate to `work/effect-native/effect-native`
3. Run: `cd packages-native/opentui-dom && pnpm tui-dom`
4. The miniapp should launch and display a form

### Test Keyboard Navigation

5. Press Tab to move between form elements
6. Verify focus indicator moves to each element
7. Press Shift+Tab to move backwards
8. On radio buttons, use Arrow keys to change selection
9. On select dropdown, use Arrow keys to change selection

### Test Form Elements

10. Type in the Name text input
11. Type in the Email input
12. Type in the Textarea
13. Toggle checkboxes with Space or Enter
14. Change radio button selection

### Test Dialog

15. Press Alt+D (or click Dialog button) to open dialog
16. Verify dialog appears with focus trap
17. Press Escape to close dialog

### Test Form Actions

18. Press Alt+S (or click Submit) - verify form data is logged
19. Press Alt+R (or click Reset) - verify form resets

### Test Mouse (if terminal supports)

20. Click on various elements
21. Verify clicks trigger the same actions as keyboard

## Expected Outcome

- All form elements render correctly
- Tab order is logical
- Focus is visually indicated
- Form inputs accept text
- Dialog opens/closes properly
- Accesskeys (Alt+letter) work
- No crashes or freezes

## Context

High-Level Goal: Prove the TUI DOM stack works end-to-end with real user interaction
Motivation: This is the capstone demo that validates the entire architecture
Obstacle: Automated tests can't verify UX feel, visual rendering, or keyboard ergonomics

## Response Options

- Reject – reason + screenshot of the broken state
- Pass – screenshot or recording showing the app working
- Pass with issues – evidence + list of UX issues or edge cases found
