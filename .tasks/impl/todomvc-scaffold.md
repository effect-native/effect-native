---
title: TodoMVC Project Scaffold
status: pending
done_when: |
  cd todomvc && pnpm install && pnpm dev
  verify: opens localhost with empty React app
basis: |
  Not started.
blocked_by:
  - .tasks/research/todomvc-spec.md
artifacts:
  - path: todomvc/package.json
    description: Package configuration with all dependencies
  - path: todomvc/vite.config.ts
    description: Vite configuration
  - path: todomvc/tsconfig.json
    description: TypeScript configuration
  - path: todomvc/src/main.tsx
    description: React entry point
  - path: todomvc/src/App.tsx
    description: Root App component
  - path: todomvc/index.html
    description: HTML template
---

# Impl: TodoMVC Project Scaffold

## Objective

Set up the project structure for the effect-atom TodoMVC implementation.

## Dependencies

```json
{
  "dependencies": {
    "@effect-atom/atom-react": "latest",
    "effect": "^3.17.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0"
  }
}
```

## Directory Structure

```
todomvc/
  src/
    atoms/           # effect-atom state
    components/      # React components
    services/        # Effect services (storage)
    App.tsx
    main.tsx
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
```

## Steps

1. Initialize package.json with dependencies
2. Configure TypeScript (strict mode)
3. Configure Vite with React plugin
4. Create minimal React app structure
5. Add TodoMVC CSS from todomvc-app-css
6. Verify dev server starts

## Verification

```bash
cd todomvc
pnpm install
pnpm dev
# Opens http://localhost:5173 with empty app
```
