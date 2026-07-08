# Claude Code — Mobile Project Instructions

## Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 55 + Expo Router v4 |
| Language | TypeScript 5 (strict) |
| UI | Tamagui |
| Server State | TanStack Query v5 |
| Client State | Zustand + `persist` middleware |
| HTTP | Axios — `src/lib/api/client.ts` |
| Forms | React Hook Form + Zod |
| Storage | SecureStore via `src/lib/storage.ts` |
| Path alias | `@/` → `src/` |

## Architecture

```
mobile/src/
├── app/              # Expo Router pages — thin shells only
├── features/         # Domain slices (screens, components, hooks)
├── components/ui/    # Shared primitives (Screen, AppButton, AppCard…)
├── lib/
│   ├── api/          # Axios client + fetchers + endpoints.ts
│   ├── routes.ts     # All route paths
│   └── query-client.ts
├── stores/           # Zustand (auth, cart, preferences)
├── hooks/            # Global TanStack Query hooks
├── types/            # domain.ts + api.ts (DTOs)
└── constants/        # theme.ts, config.ts
```

## Non-Negotiable Rules

1. **No `any`** — use `unknown`, generics, or proper domain types.
2. **Named exports everywhere** — `default export` only in `app/` page files.
3. **`import type`** for every type-only import.
4. **All server state via TanStack Query** — no `useEffect + fetch`.
5. **All forms via React Hook Form + Zod** — no uncontrolled inputs.
6. **No bare `View` / `Text` from React Native** — use Tamagui equivalents.
7. **No `StyleSheet.create`** — use Tamagui props.
8. **`app/` pages are always thin shells** — zero logic, one import.
9. **All API paths in `endpoints.ts`** — never inline URL strings.
10. **All routes in `routes.ts`** — never hardcode strings in `router.push()`.
11. **DTO → Domain via `mappers.ts`** — UI never touches raw API shapes.
12. **Safe area**: `Math.max(insets.bottom + 16, 36)` on bottom-anchored elements.

---

## Detailed Rules & Agent Instructions

@.claude/agents/mobile.md
@.claude/agents/uiux.md
@.claude/rules/api.md
@.claude/rules/testing.md
