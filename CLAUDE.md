# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Commands

```bash
bun dev              # Start dev server
bun build            # Production build
bun build:dev        # Development build
bun lint             # Run ESLint
bun run test         # Run Vitest
bun run test:watch   # Tests in watch mode
bun preview          # Preview production build

# Run a single test file:
# npx vitest run src/test/example.test.ts
```

## Important Rules

- **90% Confidence Rule**: When executing new features or significant refactors, never make changes until you have ≥ 90% confidence in what needs to be built. Ask follow-up questions until you reach that level, but do not ask more than 3 questions.
- **Protect core libraries**: Do not replace Ketcher, XYFlow, or smiles-drawer with simpler alternatives unless explicitly asked — they are architectural decisions.
- **No raw fetch in components**: Always go through `src/lib/api/` modules.
- **No inline domain types**: Always import from `src/types/`.

## Tech Stack

- **Framework**: React 18.3 + React Router v6 (SPA, not Next.js)
- **Build Tool**: Vite 8 + TypeScript 5
- **Styling & UI**: Tailwind CSS + shadcn/ui (Radix primitives) + next-themes
- **Data Fetching**: TanStack React Query
- **Specialized Libraries**:
  - Ketcher 3.12 (latest stable molecule structure editor)
  - smiles-drawer (SMILES rendering)
- **Testing**: Vitest + Playwright
- **Package Manager**: Bun (preferred) / npm

## Project Overview

**Nitro-Cat** is a user-friendly web platform that helps medicinal and synthetic chemists quickly discover the optimal enzymes for their desired chemical reactions or biosynthesis pathways. The core goal is **simplicity and accessibility** — users do not need deep biology knowledge. The interface prioritizes clean design, excellent UX, and making enzyme selection as straightforward as possible. After analysis, users should be able to easily order the recommended enzymes.

## Architecture & Data Flow

**User flow**: `LandingPage` → `NewReactionPage` (draw substrate + product in Ketcher) → `TestReactionPage` (ranked enzyme candidates) → `GetEnzymeDialog` (order enzyme / DNA / design — defined inline in `TestReactionPage`).

**API layer** (`src/lib/api/`): All server calls go through `client.ts` (fetch wrapper). `enzymes.ts` and `reactions.ts` are currently stubs. Never call `fetch` directly in components — use the api modules.

**Data fetching**: React Query hooks live in `src/lib/hooks/` (`useReaction`, `useEnzymes`). Components consume hooks only — no raw Query calls in JSX.

**Types**: Shared types in `src/types/` (`enzyme.ts`, `reaction.ts`, `user.ts`). Always import from there; don't inline local types for domain objects.

**Session history**: `src/lib/history.ts` is in-memory only — data does not persist across page refreshes. Don't treat it as a cache or persistent store.


## Routing

| Path                     | Page                 | Layout            |
|--------------------------|----------------------|-------------------|
| `/`                      | `LandingPage`        | none              |
| `/reactions/new`         | `NewReactionPage`    | `DashboardLayout` |
| `/reactions/test/result` | `TestReactionPage`   | `DashboardLayout` |
| `/history`               | `HistoryPage`        | `DashboardLayout` |
| `/settings`              | `SettingsPage`       | `DashboardLayout` |

## Component Structure

- `src/components/layout/`   — DashboardLayout, Sidebar, Header, ThemeProvider, ThemeToggle
- `src/components/reaction/` — KetcherEditor (chemical structure drawing)
- `src/components/molecule/` — MoleculeViewer (SMILES renderer via smiles-drawer)
- `src/components/enzyme/`   — EnzymeCard, EnzymeModal, EnzymeTable, ConfidenceScore
- `src/components/ui/`       — shadcn/ui primitives (do not edit)

## Styling Guidelines

- Tailwind CSS with CSS custom properties
- Dark/light mode via `next-themes` (`attribute="class"`)
- Design tokens defined in `src/styles/globals.css`, split into `light.css` and `dark.css`
- Primary color: `#538b5e` (green)
- Dark backgrounds: `#0A0F0D`, `#0F1612`, `#1A2420`
- Light backgrounds: `#FFFFFF`, `#F7FBF9`, `#EFF6F3`
- Shadows use green-tinted rgba values (`--shadow-sm/md/lg`)
- Enzyme cards: `bg-secondary`, 1px `border-default`, 3px left success border, hover `bg-tertiary` + `glow-success`
- Confidence colors: `#25512B` (≥ 0.9), `#6CA033` (0.8–0.89), `#F69B05` (0.5–0.79), `#C00000` (< 0.5)
- Use `formatConfidenceLabel()` from `src/lib/utils/formatting.ts`
- Custom utilities: `.glow-green`, `.glow-green-sm`, `.glow-success`, `.text-glow`
- Fonts: Space Grotesk (body) + Urbanist (mono), loaded from Google Fonts
- Path alias: `@/` → `src/`

## Adding New shadcn/ui Components

```bash
npx shadcn@latest add <component>
```

Config in `components.json`.

## Environment Variables

- Copy `.env.example` → `.env.local`
- `VITE_API_URL` — base URL for the backend API (`http://localhost:8000` for local dev)
  - All requests go through `src/lib/api/client.ts` — never hardcode this URL
  - In production, points to the deployed backend service

## Testing

- Vitest (unit tests) + Playwright (E2E tests)
- Test files: `src/**/*.{test,spec}.{ts,tsx}`
- Setup file: `src/test/setup.ts`
