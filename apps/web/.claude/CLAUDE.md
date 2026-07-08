# Claude Code — Project Instructions

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| UI — Web | MUI v9 + Emotion |
| Server State | TanStack Query v5 |
| HTTP | Axios (singleton instance) |
| Forms | React Hook Form v7 + Zod v4 |
| Animation | Framer Motion |
| Icons | Iconify (`@iconify/react`) |
| Utilities | es-toolkit, minimal-shared |
| Linting | ESLint 9 (perfectionist, unused-imports) |
| Formatting | Prettier 3 |

## Architecture

```
src/
├── app/            # Next.js App Router — pages, layouts, loading, error
├── sections/       # Feature views — one sub-folder per domain (orders/, users/…)
├── components/     # Shared, reusable UI primitives
├── layouts/        # App shell layouts (dashboard, auth, simple)
├── auth/           # Auth context, guards, views, hooks
├── lib/            # Third-party configuration — axios.ts, query-client.ts
├── routes/         # Path constants (paths.ts) and route hooks
├── theme/          # MUI palette, typography, component overrides
├── hooks/          # Global reusable hooks
├── types/          # Shared TypeScript interfaces & types
├── utils/          # Pure stateless utility functions
└── _mock/          # Dev-only mock data
```

## Non-Negotiable Rules

1. **No `any`** — use `unknown`, generics, or proper domain types.
2. **Named exports only** — default exports only in Next.js page/layout files.
3. **`import type`** for every type-only import.
4. **All server-state via TanStack Query** — no `useEffect` + fetch combos.
5. **All forms via React Hook Form + Zod** — no uncontrolled inputs.
6. **`'use client'` only when mandatory** — Server Components are the default.
7. **No inline styles** — use MUI `sx` prop or `styled()`.
8. **Every component folder has `index.ts`** — clean public surface.
9. **Sections are not reused across domains** — shared UI belongs in `components/`.
10. **Run `yarn lint:fix && yarn tsc:check` before every commit**.

---

## Detailed Rules & Agent Instructions

@.claude/rules/react.md
@.claude/rules/api.md
@.claude/rules/testing.md
@.claude/agents/frontend.md
@.claude/agents/uiux.md
