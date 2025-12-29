---
title: "QA: TUI Miniapp Visual Layout & Styling"
status: pending
assigned_to: Bramwell
blocked_by:
  - .tasks/GOAL-tui-miniapp.md
done_when: |
  Bramwell has verified:
  - Layout looks reasonable at different terminal sizes
  - Tailwind-style colors are applied
  - Text is readable
  - Elements don't overlap unexpectedly
  - Scrolling works if content overflows
  Evidence: screenshots at different terminal sizes
---

# QA: TUI Miniapp Visual Layout & Styling

Bramwell, please verify the miniapp's visual appearance and layout behavior.

## Steps

1. Open terminal
2. Navigate to `work/effect-native/effect-native`
3. Run: `cd packages-native/opentui-dom && pnpm tui-dom`

### Test at Normal Size (~120x40)
4. Take a screenshot
5. Verify:
   - Form elements are aligned
   - Labels are readable
   - Colors look appropriate (not garish or unreadable)
   - Focus indicators are visible

### Test at Small Size (~80x24)
6. Resize terminal to ~80 columns x 24 rows
7. Take a screenshot
8. Verify:
   - Content is still usable
   - Scrolling works if needed
   - No elements are cut off or overlap badly

### Test at Large Size (~200x60)
9. Resize terminal to ~200 columns x 60 rows
10. Take a screenshot
11. Verify:
    - Layout doesn't break
    - Content doesn't stretch weirdly

### Check Theming
12. Verify background color is applied
13. Verify text colors have sufficient contrast
14. Verify button/input borders are visible

## Expected Outcome

- App is usable at various terminal sizes
- Colors and styling look intentional (not broken)
- Text is readable
- Layout adapts reasonably to size changes

## Context

High-Level Goal: Verify Tailwind→TUI style mapping produces acceptable visual results
Motivation: Users need the app to look good, not just function correctly
Obstacle: Visual design is subjective; only a human can judge "looks right"

## Response Options

- Reject – reason + screenshot showing the layout issue
- Pass – screenshots at 3 different sizes showing it looks reasonable
- Pass with issues – screenshots + list of visual improvements needed
