# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 demo application within the effect-native monorepo, showcasing integration of `@effect-native/platform-demo` with Next.js. It demonstrates using Effect packages in both client and server components.

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack on localhost:3000

# Building
pnpm build            # Build production with Turbopack

# Production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.0 with App Router and Turbopack
- **Styling**: Tailwind CSS v4 with PostCSS
- **Effect Integration**: Uses `@effect-native/platform-demo`, `@effect/platform-browser`, and `@effect/platform-node`
- **TypeScript**: Strict mode enabled with bundler module resolution

### Project Structure
- `src/app/`: Next.js App Router pages and layouts
- `src/client/`: Client-side components and logic marked with "use client"
- `src/server/`: Server-side components and logic marked with "use server"
- Path alias `@/*` maps to `./src/*`

### Effect Integration Patterns
This demo explores using Effect packages in Next.js environments:
- Client components import Effect packages with "use client" directive
- Server components import Effect packages with "use server" directive
- Currently demonstrates basic imports of `@effect-native/platform-demo`

### Configuration
- **ESLint**: Extends Next.js core-web-vitals and TypeScript configs
- **PostCSS**: Uses @tailwindcss/postcss plugin
- **TypeScript**: Target ES2017, JSX preserve mode for Next.js