---
title: Review TodoMVC Specification
status: pending
done_when: |
  see .tasks/research/todomvc-spec.md
  verify: contains "Requirements Checklist" with all TodoMVC spec items
basis: |
  Not started.
blocked_by: []
artifacts: []
---

# Research: TodoMVC Specification

## Objective

Review the official TodoMVC spec to understand all required functionality for a compliant implementation.

## Sources

- Official spec: https://github.com/tastejs/todomvc/blob/master/app-spec.md
- CSS: https://github.com/nicnocquee/todomvc-app-css
- Template: https://github.com/nicnocquee/todomvc-app-template

## Requirements Checklist

(To be filled during research)

### Required Features
- [ ] No todos: Hide main and footer sections
- [ ] New todo: Input at top, trim text, clear on submit
- [ ] Mark all complete: Toggle all checkbox
- [ ] Item: Show checkbox, label, destroy button on hover
- [ ] Editing: Double-click to edit, class "editing" on li
- [ ] Counter: X items left (pluralized)
- [ ] Clear completed: Only visible when completed exist
- [ ] Persistence: localStorage with namespace
- [ ] Routing: #/, #/active, #/completed

### UI/UX Requirements
- [ ] Enter key to submit new todo
- [ ] Escape key to cancel edit
- [ ] Blur to save edit
- [ ] Empty edit deletes todo
- [ ] Checkbox reflects completed state
- [ ] Strikethrough for completed

### Routing Requirements
- [ ] Hash-based routing
- [ ] Default to #/ (all)
- [ ] Highlight current filter

## Notes

(Add observations during research)
