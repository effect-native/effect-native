# Repository Guidelines

## Project Structure & Module Organization

- `src/app`: Expo Router routes and layouts (`_layout.tsx`, `+not-found.tsx`). Each file maps to a screen.
- `src/ui`: Reusable UI components. Prefer these over raw primitives (see ESLint restricted imports).
- `src/lib`: Utilities (e.g., `cx.tsx`).
- `src/user`: Viewer/user context and domain hooks.
- `src/tests`: Unit tests (e.g., `App.test.tsx`).
- `assets/`: Icons, splash, images. `translations/`: fbtee locale JSON.
- Generated/managed: `ios/`, `android/`, `.expo/` — do not edit directly.

## Build, Test, and Development Commands

- `pnpm dev`: Start the Expo dev server (Metro).
- `pnpm ios` / `pnpm android` / `pnpm web`: Run the app per platform.
- `pnpm prebuild`: Generate native projects from config.
- `pnpm dev:setup`: Initialize fbtee assets (`fbtee collect` + `translate`).
- `pnpm test`: Type-check (`tsc`), run Vitest, ESLint, and Prettier check.
- `pnpm lint` / `pnpm format`: Lint and format the codebase.

## Coding Style & Naming Conventions

- TypeScript (strict) with ESM. React 19, Expo 54.
- Prettier enforces formatting (single quotes, sorted imports, Tailwind plugin). A `pre-commit` hook auto-formats staged files.
- ESLint uses `@nkzw/eslint-config` plus repo rules; honor restricted imports in `eslint.config.js`.
- Files: Components use `PascalCase.tsx` (e.g., `Text.tsx`); hooks `useX.ts`; utilities lower camel case (e.g., `colors.ts`, `cx.tsx`). Prefer named exports.

## Testing Guidelines

- Framework: Vitest + `vitest-react-native`.
- Location: `src/tests` or colocated. Naming: `*.test.ts`/`*.test.tsx`.
- Keep tests small and focused; avoid brittle snapshots. Run `pnpm test` before pushing.

## Commit & Pull Request Guidelines

- Commits: Conventional Commits (e.g., `feat(ui): add BottomSheetModal`).
- PRs: clear description, linked issues, screenshots/gifs for UI changes, and testing notes. All checks in `pnpm test` must pass.

## Security & Configuration Tips

- Do not commit secrets. Update app settings in `app.json`.
- Avoid manual edits in `ios/` and `android/`; use `pnpm prebuild` to regenerate.
- Update `translations/` when changing user-facing copy; run `pnpm fbtee:all` if needed.

## Agent-Specific Instructions

- Keep changes minimal and focused; follow existing patterns and directory layout.
- Respect ESLint/Prettier; prefer `pnpm format` and `pnpm lint` over manual style changes.
- Add or update tests when changing logic or UI components.
