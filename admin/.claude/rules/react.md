# React & Next.js Coding Rules

## Component Anatomy

Every component follows this exact order:

```tsx
'use client'; // 1. directive (if needed)

import type { … } from '…'; // 2. type-only imports

import { … } from '…'; // 3. value imports (sorted by perfectionist)

// src/ imports after external
import { … } from 'src/…';

// ---------------------------------------------------------------------- // 4. section separator

type Props = { // 5. props type (never inline)
  title: string;
  description?: string;
  sx?: SxProps<Theme>;
};

export function MyComponent({ title, description, sx }: Props) { // 6. named export
  // 7. hooks (rules of hooks — top level, always)

  // 8. derived state / memos

  // 9. handlers / callbacks

  // 10. render helpers
  const renderHeader = () => (
    <Box>…</Box>
  );

  // 11. return
  return (
    <Box sx={[{ /* base styles */ }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {renderHeader()}
    </Box>
  );
}
```

---

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component | PascalCase | `OrderTableRow` |
| Hook | camelCase, `use` prefix | `useOrderFilters` |
| Handler | `handle` prefix | `handleDeleteRow` |
| Render helper | `render` prefix | `renderEmptyState` |
| Boolean state | noun + adjective or `is/has` | `isOpen`, `hasError` |
| Zod schema | PascalCase + `Schema` | `OrderFormSchema` |
| Zod inferred type | PascalCase + `SchemaType` | `OrderFormSchemaType` |
| Constants (file-level) | `_camelCase` with leading underscore | `_defaultValues` |

---

## State Management

### Server state → TanStack Query (mandatory)

```tsx
// src/sections/orders/hooks/use-orders.ts
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from 'src/lib/api/orders';

export function useOrders(params: OrderParams) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => fetchOrders(params),
  });
}
```

- Query keys are arrays, always start with the resource name: `['orders', id]`.
- Mutations use `useMutation` — never call API functions directly in event handlers.
- Optimistic updates for UX-critical paths (delete, status change).

### UI / ephemeral state → `useState` / `useReducer`

- `useBoolean()` from `minimal-shared/hooks` for simple toggles.
- `useReducer` when state has ≥3 related fields that change together.
- No global UI state library (Redux, Zustand) unless explicitly discussed.

---

## Hooks Rules

- Never call hooks inside conditions, loops, or callbacks.
- Custom hooks live in `src/sections/<domain>/hooks/use-<name>.ts` (domain-specific) or `src/hooks/use-<name>.ts` (global).
- Hook file names must match the exported hook: `use-order-filters.ts` → `export function useOrderFilters`.
- Return objects from hooks, not arrays (except `useState`-style pairs):
  ```ts
  // ✅
  return { data, isLoading, error, refetch };
  // ❌
  return [data, isLoading];
  ```

---

## Forms (React Hook Form + Zod)

```tsx
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Field } from 'src/components/hook-form';

// Schema defined outside component
export type OrderFormSchemaType = z.infer<typeof OrderFormSchema>;

export const OrderFormSchema = z.object({
  title: z.string().min(1, 'Required'),
  quantity: z.number().min(1),
  status: z.enum(['pending', 'active', 'closed']),
});

export function OrderForm({ defaultValues, onSubmit }: Props) {
  const methods = useForm<OrderFormSchemaType>({
    resolver: zodResolver(OrderFormSchema),
    defaultValues,
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  return (
    <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Field.Text name="title" label="Title" />
      <Field.Select name="status" label="Status" options={statusOptions} />
      <Button type="submit" loading={isSubmitting}>Save</Button>
    </Form>
  );
}
```

- Schema lives outside the component — it is shared with the API layer for request validation.
- `defaultValues` always typed as `OrderFormSchemaType`.
- Never reset form manually — use `methods.reset(newValues)` after a successful mutation.

---

## Performance

- Wrap expensive sub-trees in `React.memo` only after profiling — not preemptively.
- `useCallback` only for handlers passed as props to `React.memo` components.
- `useMemo` only for computationally expensive derivations (sort, filter on large arrays).
- Prefer Server Components for static or infrequently-changing content.
- Use `next/dynamic` for heavy client components (charts, rich text editors):
  ```ts
  const Chart = dynamic(() => import('src/components/chart'), { ssr: false });
  ```

---

## Error Boundaries & Loading States

- Every route has a `loading.tsx` for Suspense.
- Async operations in mutations show `isSubmitting` via button `loading` prop.
- Query errors surface via `isError` + `error.message` — never `console.error` in JSX.
- Use `<Alert severity="error">` for inline error display (from template pattern).

---

## TypeScript Strictness

```ts
// ✅ Narrow unknown
function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
}

// ✅ Discriminated unions for API responses
type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

// ❌ Never
const data = response as any;
```

- `as` casts require a comment explaining why the type system cannot infer the correct type.
- Use `satisfies` operator to validate object literals against a type without widening.
- `readonly` on arrays and objects that must not be mutated.
