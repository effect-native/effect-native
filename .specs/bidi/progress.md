# WebDriver BiDi Implementation Progress

## Milestone 0: Bootstrapping
- [ ] Provide a runnable WebDriver BiDi transport
- [x] Implement command routing for request/response pairs
- [x] Surface WebDriver BiDi events to subscribers
- [ ] Publish a default JSON transport over WebSocket

## Milestone 1: Platform Transport Layers
- [ ] Deliver concrete `Layer`s for Firefox, Chrome, Node.js, Bun, and React Native transports
  - [ ] Document transport capabilities and constraints for each target in `.specs/bidi/research/<target>.md`
  - [ ] Capture protocol handshake requirements and authentication notes in `.specs/bidi/research/handshake.md`
  - [ ] Prototype connectivity harnesses in `packages-native/bidi/test/platform` once research notes exist

## Milestone 2: Specification Coverage
- [ ] Track per-module command and event support in `.specs/bidi/coverage.md`
- [ ] Implement serialization and validation for core command shapes
- [ ] Model subscription lifecycles and filtering semantics for events

## Milestone 3: Runtime Productization
- [ ] Provide example applications for Bun, Node.js, and React Native showcasing layered transports
- [ ] Harden error reporting and retry semantics for production environments
- [ ] Establish CI coverage across supported runtimes using the new transports

## Research Backlog
- [ ] Create `.specs/bidi/research/README.md` describing how findings are recorded and cross-referenced
- [ ] Survey vendor documentation for Firefox Remote Protocol and Chrome DevTools transport compatibility
- [ ] Investigate React Native WebSocket limitations and record findings in `.specs/bidi/research/react-native.md`
- [ ] Determine Bun runtime WebSocket APIs and document them in `.specs/bidi/research/bun.md`
- [ ] Outline Node.js WebSocket implementation strategy in `.specs/bidi/research/node.md`

## Change Management
- [ ] Establish a process document in `.specs/bidi/change-log.md` for tracking draft spec revisions
- [ ] For each new WebDriver BiDi draft, diff the Bikeshed source and summarize required work in `.specs/bidi/change-log.md`
- [ ] Schedule follow-up PRs when the draft spec adds or amends commands, events, or transport rules

## Notes
- Implementation follows the [WebDriver BiDi draft specification](https://w3c.github.io/webdriver-bidi/).
- Progress items will be checked as the implementation evolves across PRs.
