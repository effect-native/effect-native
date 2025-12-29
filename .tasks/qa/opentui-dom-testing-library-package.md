---
title: "QA: Review opentui-dom-testing-library API design"
status: pending
assigned_to: Bramwell
blocked_by:
  - .tasks/GOAL-opentui-dom-testing-lib.md
done_when: |
  Bramwell has evaluated the API design:
  - Does it follow @testing-library conventions?
  - Is it intuitive for developers familiar with React Testing Library?
  - Are there footguns or confusing patterns?
  Evidence: written evaluation comparing to @testing-library/react
---

# QA: Review opentui-dom-testing-library API Design

Bramwell, please evaluate whether the `@effect-native/opentui-dom-testing-library` API is well-designed and follows established conventions.

## Hypothesis to Invalidate

"The testing library API matches @testing-library conventions and will feel familiar to React developers."

## Steps

1. Open `packages-native/opentui-dom-testing-library/src/`
2. Review the public API exports in `index.ts`
3. Compare against @testing-library/react patterns:
   - `render()` - Does it return the same shape? (container, queries, etc.)
   - `screen` - Are the same queries available? (getByRole, getByText, etc.)
   - `fireEvent` - Does it have the same methods? (click, keyDown, type, etc.)
4. Look at the test files to see how the API is used

## Questions to Answer

1. **Convention compliance**: Can someone copy-paste a @testing-library/react test and have it mostly work?
2. **Documentation**: Are the function signatures clear? Would a developer know what to pass?
3. **Error messages**: When a query fails, is the error helpful?
4. **Footguns**: Are there easy mistakes to make? (e.g., forgetting cleanup, async issues)

## Reference

Compare against: https://testing-library.com/docs/react-testing-library/api

## Context

High-Level Goal: Make TUI testing feel familiar to web developers
Motivation: Adoption depends on low learning curve
Obstacle: API design quality requires human judgment—tests can't tell if an API is intuitive

## Response Options

- Reject – "API diverges significantly from conventions" + specific issues
- Pass – "API follows conventions well" + brief notes
- Pass with issues – "Mostly good but these patterns are confusing..." + list
