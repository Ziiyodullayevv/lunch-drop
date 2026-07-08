# Skill: new-screen

**Trigger:** user types `/new-screen <domain>` (e.g. `/new-screen notifications`)

Create a complete mobile feature screen for the given domain. Follow every step in order.

---

## Step 1 — Ask for clarification (if not provided)

Before generating, confirm:
1. Domain name (e.g. `notifications`, `profile`, `favorites`)
2. Route path (e.g. `/notifications`, `/(tabs)/favorites`)
3. Is it a list screen or detail screen?
4. Does it need a TanStack Query hook or is it purely local?

---

## Step 2 — Files to create

Replace `<domain>` with the actual name (kebab-case), `<Domain>` with PascalCase.

### 2a. API fetcher — `src/lib/api/<domain>.ts`

```ts
// src/lib/api/<domain>.ts
import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { <Domain>Dto } from '@/types/api';
import type { <Domain>Item } from '@/types/domain';

// Add DTO type to src/types/api.ts if not already there
export async function list<Domain>s(): Promise<<Domain>Item[]> {
  const res = await apiClient.get<<Domain>Dto[]>(endpoints.<domain>.list);
  return res.data.map(map<Domain>);
}

export async function get<Domain>(id: string): Promise<<Domain>Item> {
  const res = await apiClient.get<<Domain>Dto>(endpoints.<domain>.detail(id));
  return map<Domain>(res.data);
}

// Mapper — DTO (snake_case) → Domain (camelCase)
function map<Domain>(dto: <Domain>Dto): <Domain>Item {
  return {
    id:        dto.id,
    // … map fields
    createdAt: dto.created_at,
  };
}
```

### 2b. Add types to `src/types/domain.ts`

```ts
export type <Domain>Item = {
  id: string;
  // … add real fields
  createdAt: string;
};
```

### 2c. Add DTO to `src/types/api.ts`

```ts
export type <Domain>Dto = {
  id: string;
  // … snake_case fields from backend
  created_at: string;
};
```

### 2d. Add to `src/lib/api/endpoints.ts`

```ts
<domain>: {
  list:   '/<domain>s',
  detail: (id: string) => `/<domain>s/${id}`,
},
```

### 2e. Add to `src/lib/routes.ts`

```ts
<domain>:  '/<domain>',                        // static route
// OR for dynamic:
<domain>: (id: string) => `/<domain>/${id}`,
```

### 2f. TanStack Query hook — `src/hooks/use-<domain>.ts`

```ts
// src/hooks/use-<domain>.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { list<Domain>s, get<Domain> } from '@/lib/api/<domain>';

export const <domain>Keys = {
  all:    ['<domain>s'] as const,
  list:   () => [...<domain>Keys.all] as const,
  detail: (id: string) => [...<domain>Keys.all, id] as const,
};

export function use<Domain>s() {
  const query = useQuery({
    queryKey: <domain>Keys.list(),
    queryFn:  list<Domain>s,
  });
  return {
    <domain>s: query.data ?? [],
    isLoading: query.isLoading,
    error:     query.error,
    refetch:   query.refetch,
  };
}

export function use<Domain>(id: string) {
  return useQuery({
    queryKey: <domain>Keys.detail(id),
    queryFn:  () => get<Domain>(id),
    enabled:  !!id,
  });
}
```

### 2g. Screen component — `src/features/<domain>/screens/<domain>-screen.tsx`

```tsx
// src/features/<domain>/screens/<domain>-screen.tsx
import { YStack, Text } from 'tamagui';

import { Screen }     from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, ErrorState } from '@/components/ui/state-view';
import { use<Domain>s } from '@/hooks/use-<domain>';

// ----------------------------------------------------------------------

export function <Domain>Screen() {
  const { <domain>s, isLoading, error, refetch } = use<Domain>s();

  // ----------------------------------------------------------------------

  const renderContent = () => {
    if (isLoading) return <LoadingState />;
    if (error)     return <ErrorState onRetry={refetch} />;
    if (<domain>s.length === 0) {
      return <EmptyState title="Ma'lumot yo'q" description="Hozircha hech narsa yo'q" />;
    }
    return (
      <YStack gap="$3">
        {<domain>s.map((item) => (
          <Text key={item.id} color="$color">{item.id}</Text>
          // replace with real <domain> card component
        ))}
      </YStack>
    );
  };

  // ----------------------------------------------------------------------

  return (
    <Screen title="<Domain>lar" scroll>
      {renderContent()}
    </Screen>
  );
}
```

### 2h. Expo Router page — `src/app/<route>.tsx`

```tsx
// src/app/<route>.tsx
import { <Domain>Screen } from '@/features/<domain>/screens/<domain>-screen';

export default function <Domain>Page() {
  return <<Domain>Screen />;
}
```

For dynamic route (`src/app/<domain>/[id].tsx`):

```tsx
import { useLocalSearchParams } from 'expo-router';
import { <Domain>DetailScreen } from '@/features/<domain>/screens/<domain>-detail-screen';

export default function <Domain>DetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <<Domain>DetailScreen id={id} />;
}
```

---

## Step 3 — Patterns to follow for specific screen types

### List screen

```tsx
export function <Domain>Screen() {
  const { <domain>s, isLoading, error, refetch } = use<Domain>s();

  const renderItem = (item: <Domain>Item) => (
    <AppCard
      key={item.id}
      pressable
      onPress={() => router.push(routes.<domain>(item.id))}
    >
      <Text color="$color" fontSize="$5" fontWeight="700">{item.name}</Text>
    </AppCard>
  );

  return (
    <Screen title="<Domain>lar" scroll>
      {isLoading && <LoadingState />}
      {error     && <ErrorState onRetry={refetch} />}
      {!isLoading && !error && (
        <domain>s.length === 0
          ? <EmptyState title="Hech narsa yo'q" />
          : <YStack gap="$3">{<domain>s.map(renderItem)}</YStack>
      )}
    </Screen>
  );
}
```

### Detail screen

```tsx
type Props = { id: string };

export function <Domain>DetailScreen({ id }: Props) {
  const { data: item, isLoading, error } = use<Domain>(id);

  const renderHeader = () => (
    <YStack gap="$1">
      <Text fontSize={28} fontWeight="800" color="#1C1C1E">{item?.name}</Text>
    </YStack>
  );

  const renderBody = () => (
    <AppCard title="Tafsilotlar">
      {/* fields */}
    </AppCard>
  );

  return (
    <Screen scroll={false}>
      {isLoading && <LoadingState />}
      {error     && <ErrorState />}
      {item && (
        <YStack flex={1} gap="$4">
          {renderHeader()}
          {renderBody()}
        </YStack>
      )}
    </Screen>
  );
}
```

### Form screen (create/edit)

```tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '@/components/ui/input';
import { AppButton } from '@/components/ui/button';

const Schema = z.object({
  name: z.string().min(1, 'Majburiy'),
});
type FormValues = z.infer<typeof Schema>;

export function <Domain>FormScreen() {
  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '' },
    mode: 'onChange',
  });
  const mutation = useCreate<Domain>();

  async function handleSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync(values);
      router.back();
    } catch (err) {
      Alert.alert('Xatolik', err instanceof Error ? err.message : 'Xatolik yuz berdi');
    }
  }

  return (
    <Screen title="Yangi <Domain>" scroll={false}>
      <YStack flex={1} gap="$4">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <AppInput
              label="Nom"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
      </YStack>
      <YStack paddingBottom={Math.max(insets.bottom + 16, 36)}>
        <AppButton
          label="Saqlash"
          variant="primary"
          loading={mutation.isPending}
          onPress={form.handleSubmit(handleSubmit)}
        />
      </YStack>
    </Screen>
  );
}
```

---

## Step 4 — Quality checklist

Before finishing, verify:
- [ ] `app/` page is a thin shell — zero logic, one import
- [ ] `endpoints.ts` updated with new paths
- [ ] `routes.ts` updated with new route
- [ ] Domain type added to `src/types/domain.ts`
- [ ] DTO added to `src/types/api.ts`
- [ ] Mapper function in `lib/api/<domain>.ts` — no raw DTOs in UI
- [ ] `isLoading` / `error` / empty — all three states handled
- [ ] `Screen` wrapper used — never raw `YStack` / `ScrollView` as root
- [ ] Safe area: `Math.max(insets.bottom + 16, 36)` on bottom-anchored buttons
- [ ] No bare `View` / `Text` from React Native — Tamagui only
- [ ] No `StyleSheet.create`
- [ ] Named export on screen component, `default export` only on page
