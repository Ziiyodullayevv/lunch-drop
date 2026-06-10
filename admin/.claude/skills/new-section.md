# Skill: new-section

**Trigger:** user types `/new-section <domain>` (e.g. `/new-section kitchen`)

Create a complete admin panel feature section for the given domain. Follow every step in order. Do not skip any file.

---

## Step 1 — Ask for clarification (if not provided)

Before generating, confirm:
1. Domain name (e.g. `kitchen`, `order`, `employee`)
2. Has list view? (almost always yes)
3. Has create form? Has edit form?
4. Main fields for the domain type

---

## Step 2 — Files to create

Replace `<domain>` with the actual name (kebab-case), `<Domain>` with PascalCase, `<DOMAIN>` with SCREAMING_SNAKE.

### 2a. Types — `src/sections/<domain>/types.ts`

```ts
// src/sections/<domain>/types.ts

export type <Domain>Item = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  // … add real fields
};

export type <Domain>TableFilters = {
  name: string;
  status: string;
};
```

### 2b. API fetcher — `src/lib/api/<domain>.ts`

```ts
// src/lib/api/<domain>.ts
import type { <Domain>Item } from 'src/sections/<domain>/types';
import axiosInstance, { endpoints } from 'src/lib/axios';

export async function list<Domain>s(): Promise<<Domain>Item[]> {
  const res = await axiosInstance.get(endpoints.<domain>.list);
  return res.data;
}

export async function get<Domain>(id: string): Promise<<Domain>Item> {
  const res = await axiosInstance.get(endpoints.<domain>.detail(id));
  return res.data;
}

export async function create<Domain>(data: Partial<<Domain>Item>): Promise<<Domain>Item> {
  const res = await axiosInstance.post(endpoints.<domain>.create, data);
  return res.data;
}

export async function update<Domain>(id: string, data: Partial<<Domain>Item>): Promise<<Domain>Item> {
  const res = await axiosInstance.patch(endpoints.<domain>.update(id), data);
  return res.data;
}

export async function delete<Domain>(id: string): Promise<void> {
  await axiosInstance.delete(endpoints.<domain>.delete(id));
}
```

### 2c. TanStack Query hooks — `src/sections/<domain>/hooks/use-<domain>.ts`

```ts
// src/sections/<domain>/hooks/use-<domain>.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { list<Domain>s, get<Domain>, create<Domain>, update<Domain>, delete<Domain> } from 'src/lib/api/<domain>';

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
    <domain>s:  query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    error:      query.error,
    refetch:    query.refetch,
  };
}

export function use<Domain>(id: string) {
  return useQuery({
    queryKey: <domain>Keys.detail(id),
    queryFn:  () => get<Domain>(id),
    enabled:  !!id,
  });
}

export function useCreate<Domain>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create<Domain>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: <domain>Keys.all });
    },
  });
}

export function useUpdate<Domain>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<<Domain>Item> }) =>
      update<Domain>(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: <domain>Keys.all });
      void queryClient.invalidateQueries({ queryKey: <domain>Keys.detail(id) });
    },
  });
}

export function useDelete<Domain>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => delete<Domain>(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: <domain>Keys.all });
    },
  });
}
```

### 2d. List view — `src/sections/<domain>/view/<domain>-list-view.tsx`

Follow this exact structure from the codebase:

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { use<Domain>s, useDelete<Domain> } from '../hooks/use-<domain>';
import type { <Domain>Item } from '../types';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name',   label: 'Nom' },
  { id: 'status', label: 'Status', width: 130 },
  { id: '',       width: 60 },
];

// ----------------------------------------------------------------------

export function <Domain>ListView() {
  const table = useTable();
  const confirmDelete = useBoolean();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { <domain>s, isLoading } = use<Domain>s();
  const deleteMutation = useDelete<Domain>();

  // ----------------------------------------------------------------------

  const handleDeleteRow = useCallback((id: string) => {
    setDeleteId(id);
    confirmDelete.onTrue();
  }, [confirmDelete]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Muvaffaqiyatli o\'chirildi');
      confirmDelete.onFalse();
    } catch {
      toast.error('O\'chirishda xatolik');
    }
  }, [deleteId, deleteMutation, confirmDelete]);

  // ----------------------------------------------------------------------

  const renderHead = () => (
    <CustomBreadcrumbs
      heading="<Domain>lar"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: '<Domain>lar' },
      ]}
      action={
        <Button
          component={RouterLink}
          href={paths.dashboard.<domain>.create}
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          Yangi qo'shish
        </Button>
      }
      sx={{ mb: 3 }}
    />
  );

  const renderTable = () => (
    <Card>
      <Scrollbar>
        <Table size={table.dense ? 'small' : 'medium'}>
          <TableHeadCustom
            order={table.order}
            orderBy={table.orderBy}
            headLabel={TABLE_HEAD}
            onSort={table.onSort}
          />
          <TableBody>
            {isLoading
              ? null
              : <domain>s.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Label
                        variant="soft"
                        color={row.status === 'active' ? 'success' : 'default'}
                      >
                        {row.status}
                      </Label>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        component={RouterLink}
                        href={paths.dashboard.<domain>.edit(row.id)}
                      >
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDeleteRow(row.id)}>
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
            }
            <TableNoData notFound={!isLoading && <domain>s.length === 0} />
          </TableBody>
        </Table>
      </Scrollbar>
      <TablePaginationCustom
        page={table.page}
        dense={table.dense}
        count={<domain>s.length}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        onChangeDense={table.onChangeDense}
        onRowsPerPageChange={table.onChangeRowsPerPage}
      />
    </Card>
  );

  // ----------------------------------------------------------------------

  return (
    <DashboardContent maxWidth="xl">
      {renderHead()}
      {renderTable()}

      <ConfirmDialog
        open={confirmDelete.value}
        onClose={confirmDelete.onFalse}
        title="O'chirish"
        content="Haqiqatan ham o'chirmoqchimisiz?"
        action={
          <Button
            variant="contained"
            color="error"
            loading={deleteMutation.isPending}
            onClick={handleConfirmDelete}
          >
            O'chirish
          </Button>
        }
      />
    </DashboardContent>
  );
}
```

### 2e. Create/Edit view — `src/sections/<domain>/view/<domain>-create-view.tsx`

```tsx
'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useCreate<Domain>, useUpdate<Domain> } from '../hooks/use-<domain>';
import type { <Domain>Item } from '../types';

// ----------------------------------------------------------------------

export type <Domain>FormSchemaType = z.infer<typeof <Domain>FormSchema>;

export const <Domain>FormSchema = z.object({
  name:   z.string().min(1, 'Nom majburiy'),
  status: z.string().min(1, 'Status majburiy'),
  // … add real fields
});

// ----------------------------------------------------------------------

type Props = {
  currentItem?: <Domain>Item;
};

export function <Domain>CreateView({ currentItem }: Props) {
  const router = useRouter();
  const isEdit = !!currentItem;

  const createMutation = useCreate<Domain>();
  const updateMutation = useUpdate<Domain>();

  const methods = useForm<<Domain>FormSchemaType>({
    resolver: zodResolver(<Domain>FormSchema),
    defaultValues: {
      name:   currentItem?.name   ?? '',
      status: currentItem?.status ?? 'active',
    },
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  // ----------------------------------------------------------------------

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: currentItem.id, data });
        toast.success('Muvaffaqiyatli yangilandi');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Muvaffaqiyatli yaratildi');
      }
      router.push(paths.dashboard.<domain>.root);
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    }
  });

  // ----------------------------------------------------------------------

  const renderForm = () => (
    <Card>
      <CardHeader title="Asosiy ma'lumotlar" />
      <Divider />
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Field.Text name="name" label="Nom" />
          <Field.Select name="status" label="Status">
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </Field.Select>
        </Stack>
      </Box>
    </Card>
  );

  const renderActions = () => (
    <Stack direction="row" spacing={2} justifyContent="flex-end">
      <Button variant="outlined" onClick={() => router.back()}>
        Bekor qilish
      </Button>
      <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
        {isEdit ? 'Saqlash' : 'Yaratish'}
      </LoadingButton>
    </Stack>
  );

  // ----------------------------------------------------------------------

  return (
    <DashboardContent maxWidth="lg">
      <CustomBreadcrumbs
        heading={isEdit ? '<Domain>ni tahrirlash' : 'Yangi <Domain>'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: '<Domain>lar', href: paths.dashboard.<domain>.root },
          { name: isEdit ? 'Tahrirlash' : 'Yangi' },
        ]}
        sx={{ mb: 3 }}
      />

      <Form methods={methods} onSubmit={onSubmit}>
        <Stack spacing={3}>
          {renderForm()}
          {renderActions()}
        </Stack>
      </Form>
    </DashboardContent>
  );
}
```

### 2f. Barrel — `src/sections/<domain>/view/index.ts`

```ts
export * from './<domain>-list-view';
export * from './<domain>-create-view';
```

### 2g. App pages (thin shells)

```tsx
// src/app/dashboard/<domain>/page.tsx
import { <Domain>ListView } from 'src/sections/<domain>/view';
export const metadata = { title: '<Domain>lar' };
export default function <Domain>ListPage() {
  return <<Domain>ListView />;
}
```

```tsx
// src/app/dashboard/<domain>/create/page.tsx
import { <Domain>CreateView } from 'src/sections/<domain>/view';
export const metadata = { title: 'Yangi <Domain>' };
export default function <Domain>CreatePage() {
  return <<Domain>CreateView />;
}
```

```tsx
// src/app/dashboard/<domain>/[id]/edit/page.tsx
import { <Domain>CreateView } from 'src/sections/<domain>/view';
// fetch currentItem server-side or pass id to view
export default function <Domain>EditPage() {
  return <<Domain>CreateView />;
}
```

---

## Step 3 — Update existing files

### `src/routes/paths.ts` — add domain paths

```ts
<domain>: {
  root:   `${ROOTS.DASHBOARD}/<domain>`,
  create: `${ROOTS.DASHBOARD}/<domain>/create`,
  edit:   (id: string) => `${ROOTS.DASHBOARD}/<domain>/${id}/edit`,
},
```

### `src/lib/axios.ts` — add to `endpoints` object

```ts
<domain>: {
  list:   '/api/<domain>s',
  detail: (id: string) => `/api/<domain>s/${id}`,
  create: '/api/<domain>s',
  update: (id: string) => `/api/<domain>s/${id}`,
  delete: (id: string) => `/api/<domain>s/${id}`,
},
```

### `src/layouts/nav-config-dashboard.tsx` — add nav item

```ts
{
  title: '<Domain>lar',
  path: paths.dashboard.<domain>.root,
  icon: ICONS.<domain>,   // pick appropriate solar: icon
},
```

---

## Step 4 — Quality checklist

Before finishing, verify:
- [ ] All files use **named exports** (except `app/` pages)
- [ ] No `any` types — all generics properly typed
- [ ] `import type` for all type-only imports
- [ ] TanStack Query hooks — never bare `useEffect + fetch`
- [ ] Form uses `zodResolver` — no uncontrolled inputs
- [ ] `toast.success` / `toast.error` on mutation results
- [ ] `ConfirmDialog` before destructive actions
- [ ] `paths.ts` and `endpoints` updated
