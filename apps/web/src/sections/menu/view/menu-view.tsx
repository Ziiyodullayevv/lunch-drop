'use client';

import type { MenuScheduleRead } from 'src/lib/api/meals';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { usePopover } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { Form, Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';
import { useTranslate } from 'src/locales';

import {
  useMeals,
  useSchedules,
  useCategories,
  useCreateMeal,
  useDeleteMeal,
  useUpdateMeal,
  useScheduleMenu,
} from '../hooks/use-meals';

// ----------------------------------------------------------------------

// ISO: 1=Du, 2=Se, 3=Chor, 4=Pay, 5=Ju, 6=Sha, 7=Yak
const WEEK_DAYS = [
  { value: 1, label: 'Du', fullLabel: 'Dushanba' },
  { value: 2, label: 'Se', fullLabel: 'Seshanba' },
  { value: 3, label: 'Chor', fullLabel: 'Chorshanba' },
  { value: 4, label: 'Pay', fullLabel: 'Payshanba' },
  { value: 5, label: 'Ju', fullLabel: 'Juma' },
  { value: 6, label: 'Sha', fullLabel: 'Shanba' },
  { value: 7, label: 'Yak', fullLabel: 'Yakshanba' },
];

function getDayLabel(day: number) {
  return WEEK_DAYS.find((d) => d.value === day)?.label ?? String(day);
}

// specific_date (ISO string) → ISO weekday (1=Du … 7=Yak)
function dateToIsoWeekday(dateStr: string): number {
  const d = new Date(dateStr);
  const js = d.getUTCDay(); // 0=Sun
  return js === 0 ? 7 : js;
}

// Returns today's ISO weekday in Tashkent time (1=Mon, 7=Sun)
function getTashkentWeekday(): number {
  const now = new Date();
  const tashkent = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const jsDay = tashkent.getDay(); // 0=Sun, 1=Mon...
  return jsDay === 0 ? 7 : jsDay;
}

// ----------------------------------------------------------------------

type FoodCategory = { id: string; name: string; icon: string | null };

type FoodTag = { id: string; name: string };

type FoodItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  category_id: string | null;
  available_days: number[];
  is_spicy: boolean;
  is_halal: boolean;
  is_vegetarian: boolean;
  weight_grams: number | null;
  calories: number | null;
  portion_size: string | null;
  delivery_available: boolean;
  pre_order_required: boolean;
  tags?: FoodTag[];
  menuId: string;
  created_at?: string;
};

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Mahsulot' },
  { id: 'category', label: 'Kategoriya', width: 160 },
  { id: 'days', label: 'Kunlar', width: 260 },
  { id: 'price', label: 'Narxi', width: 120 },
  { id: 'available', label: 'Holat', width: 110 },
  { id: 'created_at', label: "Qo'shilgan", width: 130 },
  { id: 'actions', label: '', width: 60 },
];

const MENU_STATUS_TABS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'available', label: 'Mavjud' },
  { value: 'unavailable', label: 'Mavjud emas' },
];

// ----------------------------------------------------------------------

const FoodSchema = z.object({
  name:        z.string().min(1, { message: 'Nomi majburiy' }),
  description: z.string().optional(),
  price:       z.string().min(1, { message: 'Narxi majburiy' }),
  image_url:   z.string().optional(),
  category_id: z.string().optional(),
});

type FoodForm = z.infer<typeof FoodSchema>;

const FOOD_DEFAULT: FoodForm = {
  name: '', description: '', price: '', image_url: '', category_id: '',
};

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

function FoodFormFields({ categories }: { categories: FoodCategory[] }) {
  return (
    <>
      <Field.Text name="name" label="Nomi" slotProps={{ inputLabel: { shrink: true } }} />
      <Field.Text
        name="description"
        label="Tavsif"
        multiline
        rows={2}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Stack direction="row" spacing={2}>
        <Field.Text
          name="price"
          label="Narxi (so'm)"
          placeholder="25000"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: 1 }}
        />
        <Field.Select
          name="category_id"
          label="Kategoriya"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: 1 }}
        >
          <MenuItem value="">— Tanlanmagan —</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </Field.Select>
      </Stack>
      <Field.ImageUpload name="image_url" label="Rasm" />
    </>
  );
}

// ----------------------------------------------------------------------

export function EditFoodDialog({
  open, onClose, item, onSuccess, categories,
}: {
  open: boolean; onClose: () => void;
  item: FoodItem; onSuccess: () => void; categories: FoodCategory[];
}) {
  const updateMeal = useUpdateMeal(item.id);

  const methods = useForm<FoodForm>({
    resolver: zodResolver(FoodSchema),
    defaultValues: {
      name: item.name, description: item.description ?? '', price: String(item.price),
      image_url: item.image_url ?? '', category_id: item.category_id ?? '',
    },
  });

  const { handleSubmit, reset, formState: { isSubmitting } } = methods;

  useEffect(() => {
    if (open) {
      reset({
        name: item.name, description: item.description ?? '', price: String(item.price),
        image_url: item.image_url ?? '', category_id: item.category_id ?? '',
      });
    }
  }, [open, item, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateMeal.mutateAsync({
        name:        data.name,
        description: data.description || null,
        price:       parseFloat(data.price),
        image_url:   data.image_url || null,
        category_id: data.category_id || null,
      });
      onClose();
      onSuccess();
      toast.success('Ovqat yangilandi');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }}>
      <DialogTitle sx={{ py: 2, px: 3 }}>Ovqatni tahrirlash</DialogTitle>
      <Form methods={methods} onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2.5}>
            <FoodFormFields categories={categories} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">Bekor qilish</Button>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>Saqlash</LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function AddFoodDialog({
  open, onClose, onSuccess, categories,
}: {
  open: boolean; onClose: () => void;
  onSuccess: () => void; categories: FoodCategory[];
}) {
  const createMeal = useCreateMeal();

  const methods = useForm<FoodForm>({
    resolver: zodResolver(FoodSchema),
    defaultValues: FOOD_DEFAULT,
  });
  const { handleSubmit, reset, formState: { isSubmitting } } = methods;

  useEffect(() => { if (open) reset(FOOD_DEFAULT as FoodForm); }, [open, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createMeal.mutateAsync({
        name:        data.name,
        description: data.description || null,
        price:       parseFloat(data.price),
        image_url:   data.image_url || null,
        category_id: data.category_id || null,
      });
      toast.success("Ovqat qo'shildi");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }}>
      <DialogTitle sx={{ py: 2, px: 3 }}>Ovqat qo&apos;shish</DialogTitle>
      <Form methods={methods} onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2.5}><FoodFormFields categories={categories} /></Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">Bekor qilish</Button>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>Qo&apos;shish</LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function DaysCell({ days }: { days: number[] }) {
  if (!days || days.length === 0) {
    return <Chip label="Belgilanmagan" size="small" color="warning" variant="soft" />;
  }
  const sorted = [...days].sort((a, b) => a - b);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxWidth: 236 }}>
      {sorted.map((d) => (
        <Chip
          key={d}
          label={getDayLabel(d)}
          size="small"
          variant="outlined"
          sx={(theme) => ({
            minWidth: 44,
            fontWeight: 700,
            color: 'info.darker',
            borderColor: 'info.lighter',
            bgcolor: 'info.lighter',
            '& .MuiChip-label': { px: 1.25 },
            ...theme.applyStyles('dark', {
              color: 'info.lighter',
              borderColor: 'info.dark',
              bgcolor: 'rgba(0, 184, 217, 0.16)',
            }),
          })}
        />
      ))}
    </Box>
  );
}

// ----------------------------------------------------------------------

function FoodTableRow({
  item, categories, selected, onSelect,
}: {
  item: FoodItem;
  categories: FoodCategory[];
  selected: boolean; onSelect: () => void;
}) {
  const { t } = useTranslate('common');
  const popover = usePopover();
  const router = useRouter();
  const deleteMeal = useDeleteMeal();

  const categoryName = categories.find((c) => c.id === item.category_id)?.name ?? '—';

  const handleDelete = async () => {
    popover.onClose();
    try {
      await deleteMeal.mutateAsync(item.id);
      toast.success("Ovqat o'chirildi");
    } catch { toast.error('Xatolik yuz berdi'); }
  };

  const handleToggle = () => {
    popover.onClose();
    toast.info('Bu funksiya hali qo\'shilmagan');
  };

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox checked={selected} onClick={onSelect} />
        </TableCell>

        {/* Mahsulot */}
        <TableCell>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar
              src={item.image_url ?? undefined}
              variant="rounded"
              sx={{ width: 48, height: 48, bgcolor: 'action.hover' }}
            >
              <Iconify icon="solar:cup-star-bold" sx={{ color: 'text.disabled' }} />
            </Avatar>
            <Box sx={{ minWidth: 0, maxWidth: 220 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {item.name}
              </Typography>
              {item.description && (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{
                    mt: 0.3,
                    display: '-webkit-box',
                    overflow: 'hidden',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                  }}
                >
                  {item.description}
                </Typography>
              )}
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          <Typography variant="body2" color="text.secondary">{categoryName}</Typography>
        </TableCell>

        {/* Kunlar */}
        <TableCell>
          <DaysCell days={item.available_days ?? []} />
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {item.price.toLocaleString('uz-UZ')} so&apos;m
          </Typography>
        </TableCell>

        <TableCell>
          <Chip
            label={item.available ? t('menu.available') : t('menu.unavailable')}
            color={item.available ? 'success' : 'default'}
            size="small"
            variant="soft"
          />
        </TableCell>

        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {item.created_at ? fDate(item.created_at) : '—'}
          </Typography>
        </TableCell>

        <TableCell align="right" sx={{ px: 1 }}>
          <IconButton size="small" onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover open={popover.open} anchorEl={popover.anchorEl} onClose={popover.onClose}>
        <MenuList>
          <MenuItem onClick={() => { popover.onClose(); router.push(paths.dashboard.menu.details(item.id)); }}>
            <Iconify icon="solar:eye-bold" sx={{ color: 'text.secondary' }} />
            {t('common.view')}
          </MenuItem>
          <MenuItem onClick={() => { popover.onClose(); router.push(paths.dashboard.menu.edit(item.id)); }}>
            <Iconify icon="solar:pen-bold" sx={{ color: 'text.secondary' }} />
            {t('common.edit')}
          </MenuItem>
          <MenuItem onClick={handleToggle}>
            <Iconify
              icon={item.available ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
              sx={{ color: item.available ? 'text.secondary' : 'success.main' }}
            />
            {item.available ? t('menu.markUnavailable') : t('menu.markAvailable')}
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
            {t('common.delete')}
          </MenuItem>
        </MenuList>
      </CustomPopover>

    </>
  );
}

// ----------------------------------------------------------------------

export function MenuView() {
  const { t } = useTranslate('common');
  const { user } = useAuthContext();
  const kitchenId = user?.kitchen_id as string | undefined;
  const table = useTable();

  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // bulk assign days
  const [bulkAnchorEl, setBulkAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [bulkDays, setBulkDays] = useState<number[]>([]);

  // filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: mealsData, isLoading: loading } = useMeals();
  const { data: categoriesData } = useCategories();
  const { data: schedulesData } = useSchedules();
  const deleteMeal = useDeleteMeal();
  const scheduleMenu = useScheduleMenu();

  const categories: FoodCategory[] = (categoriesData ?? []).map((c) => ({
    id: c.id, name: c.name, icon: null,
  }));

  const availableDaysMap = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    (schedulesData ?? []).forEach((s: MenuScheduleRead) => {
      let day: number | null = null;
      if (s.day_of_week != null) {
        day = s.day_of_week;
      } else if (s.specific_date) {
        // backend specific_date yozgan bo'lsa weekday ga o'giramiz
        day = dateToIsoWeekday(s.specific_date);
      }
      if (day != null) {
        (map[s.meal_id] ??= new Set()).add(day);
      }
    });
    return Object.fromEntries(
      Object.entries(map).map(([id, set]) => [id, [...set].sort((a, b) => a - b)])
    ) as Record<string, number[]>;
  }, [schedulesData]);

  const items: FoodItem[] = useMemo(
    () =>
      (mealsData?.items ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        price: parseFloat(m.price),
        image_url: m.image_url,
        available: true,
        category_id: m.category_id,
        available_days: availableDaysMap[m.id] ?? [],
        is_spicy: false,
        is_halal: false,
        is_vegetarian: false,
        weight_grams: null,
        calories: null,
        portion_size: null,
        delivery_available: true,
        pre_order_required: false,
        menuId: '',
        created_at: m.created_at,
      })),
    [mealsData, availableDaysMap]
  );

  const filteredItems = useMemo(() => {
    let result = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (filterCategory) {
      result = result.filter((i) => i.category_id === filterCategory);
    }
    if (filterDay !== null) {
      result = result.filter(
        (i) => i.available_days.length > 0 && i.available_days.includes(filterDay)
      );
    }
    if (filterStatus === 'available') {
      result = result.filter((i) => i.available);
    }
    if (filterStatus === 'unavailable') {
      result = result.filter((i) => !i.available);
    }
    return result;
  }, [items, searchQuery, filterCategory, filterDay, filterStatus]);

  const paginatedItems = filteredItems.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(table.selected.map((id) => deleteMeal.mutateAsync(id)));
      toast.success(`${table.selected.length} ta ovqat o'chirildi`);
      table.onSelectAllRows(false, []);
    } catch {
      toast.error("O'chirishda xato");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleBulkAssignDays = async () => {
    if (bulkDays.length === 0) return;

    const pairs = table.selected.flatMap((mealId) => {
      const existing = availableDaysMap[mealId] ?? [];
      return bulkDays
        .filter((day) => !existing.includes(day))
        .map((day) => ({ meal_id: mealId, day_of_week: day }));
    });

    if (pairs.length === 0) {
      toast.info('Tanlangan kunlar allaqachon biriktirilgan');
      setBulkAnchorEl(null);
      setBulkDays([]);
      table.onSelectAllRows(false, []);
      return;
    }

    try {
      await Promise.all(pairs.map((body) => scheduleMenu.mutateAsync(body)));
      toast.success(
        `${table.selected.length} ta taomga ${bulkDays.length} ta kun biriktirildi`
      );
      setBulkAnchorEl(null);
      setBulkDays([]);
      table.onSelectAllRows(false, []);
    } catch {
      toast.error('Biriktrishda xato yuz berdi');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterDay(null);
    setFilterStatus('all');
  };

  const hasFilters = searchQuery || filterCategory || filterDay !== null || filterStatus !== 'all';

  if (!kitchenId) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading={t('menu.title')}
          links={[{ name: t('navigation.dashboard'), href: paths.dashboard.root }, { name: t('menu.title') }]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('menuExtra.noKitchen')}
          </Typography>
        </Card>
      </DashboardContent>
    );
  }

  const todayWeekday = getTashkentWeekday();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('menu.title')}
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Menu' }]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setAddOpen(true)}
            disabled={false}
          >
            {t('menu.add')}
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Tabs
          value={filterStatus}
          onChange={(_, value) => {
            setFilterStatus(value);
            table.onResetPage();
          }}
          sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {MENU_STATUS_TABS.map((tab) => {
            const count =
              tab.value === 'available'
                ? items.filter((item) => item.available).length
                : tab.value === 'unavailable'
                  ? items.filter((item) => !item.available).length
                  : items.length;

            return (
              <Tab
                key={tab.value}
                value={tab.value}
                label={t(`menu.status.${tab.value}`)}
                iconPosition="end"
                icon={
                  <Label
                    variant={filterStatus === tab.value ? 'filled' : 'soft'}
                    color={
                      tab.value === 'available'
                        ? 'success'
                        : tab.value === 'unavailable'
                          ? 'error'
                          : 'default'
                    }
                    sx={{ ml: 0.5 }}
                  >
                    {count}
                  </Label>
                }
              />
            );
          })}
        </Tabs>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5, alignItems: { xs: 'stretch', md: 'center' } }}
        >
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); table.onResetPage(); }}
            placeholder={t('menu.search')}
            sx={{ width: { xs: 1, md: 360 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchQuery('');
                        table.onResetPage();
                      }}
                    >
                      <Iconify icon="solar:close-circle-bold" width={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />

          <FormControl sx={{ width: { xs: 1, md: 220 }, flexShrink: 0 }}>
            <InputLabel>{t('menu.category')}</InputLabel>
            <Select
              value={filterCategory}
              label={t('menu.category')}
              onChange={(e) => { setFilterCategory(e.target.value); table.onResetPage(); }}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ width: { xs: 1, md: 220 }, flexShrink: 0 }}>
            <InputLabel>{t('menu.day')}</InputLabel>
            <Select
              value={filterDay ?? ''}
              label={t('menu.day')}
              renderValue={(selected) => {
                const value = String(selected);
                if (value === '') return t('common.all');
                const selectedDay = WEEK_DAYS.find((day) => day.value === Number(value));
                if (!selectedDay) return '';
                return selectedDay.value === todayWeekday
                  ? `${selectedDay.fullLabel} (bugun)`
                  : selectedDay.fullLabel;
              }}
              onChange={(e) => {
                const v = String(e.target.value);
                setFilterDay(v === '' ? null : Number(v));
                table.onResetPage();
              }}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {WEEK_DAYS.map((d) => (
                <MenuItem key={d.value} value={d.value}>
                  {d.fullLabel}
                  {d.value === todayWeekday && (
                    <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1 }}>
                      (bugun)
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasFilters && (
            <Button
              size="small"
              color="error"
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={handleResetFilters}
              sx={{ minHeight: 54, flexShrink: 0 }}
            >
              Tozalash
            </Button>
          )}
        </Stack>


        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ position: 'relative' }}>
              <TableSelectedAction
                dense={table.dense}
                rowCount={paginatedItems.length}
                numSelected={table.selected.length}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(checked, paginatedItems.map((r) => r.id))
                }
                action={
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Kunlarni biriktirish">
                      <IconButton
                        color="primary"
                        onClick={(e) => {
                          const sets = table.selected.map((id) => availableDaysMap[id] ?? []);
                          const common = sets.length
                            ? WEEK_DAYS.map((d) => d.value).filter((v) =>
                                sets.every((s) => s.includes(v))
                              )
                            : [];
                          setBulkDays(common);
                          setBulkAnchorEl(e.currentTarget);
                        }}
                      >
                        <Iconify icon="solar:calendar-date-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="O'chirish">
                      <IconButton color="error" onClick={() => setConfirmDelete(true)}>
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              />

              <Scrollbar>
                <Table size="medium" sx={{ minWidth: 820 }}>
                  <TableHeadCustom
                    order={table.order}
                    orderBy={table.orderBy}
                    headCells={TABLE_HEAD}
                    rowCount={paginatedItems.length}
                    numSelected={table.selected.length}
                    onSelectAllRows={(checked) =>
                      table.onSelectAllRows(checked, paginatedItems.map((r) => r.id))
                    }
                  />
                  <TableBody>
                    {paginatedItems.map((item) => (
                      <FoodTableRow
                        key={item.id}
                        item={item}
                        categories={categories}
                        selected={table.selected.includes(item.id)}
                        onSelect={() => table.onSelectRow(item.id)}
                      />
                    ))}

                    {filteredItems.length === 0 && <TableNoData notFound />}
                  </TableBody>
                </Table>
              </Scrollbar>
            </Box>

            <TablePaginationCustom
              page={table.page}
              count={filteredItems.length}
              rowsPerPage={table.rowsPerPage}
              onPageChange={table.onChangePage}
              onRowsPerPageChange={table.onChangeRowsPerPage}
            />
          </>
        )}
      </Card>

      <AddFoodDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {}}
        categories={categories}
      />

      {/* Bulk assign days popover */}
      <Popover
        open={Boolean(bulkAnchorEl)}
        anchorEl={bulkAnchorEl}
        onClose={() => setBulkAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2.5, width: 300, borderRadius: 2 } } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Kunlarni biriktirish
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {table.selected.length} ta taomga bir vaqtda biriktiriladi
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {WEEK_DAYS.map((d) => {
            const active = bulkDays.includes(d.value);
            return (
              <Chip
                key={d.value}
                label={d.label}
                size="small"
                variant={active ? 'filled' : 'outlined'}
                color={active ? 'primary' : 'default'}
                onClick={() =>
                  setBulkDays((prev) =>
                    prev.includes(d.value)
                      ? prev.filter((x) => x !== d.value)
                      : [...prev, d.value].sort((a, b) => a - b)
                  )
                }
                sx={{ cursor: 'pointer', fontWeight: 700, minWidth: 44 }}
              />
            );
          })}
        </Box>

        {bulkDays.length > 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
            Tanlangan: {bulkDays.map(getDayLabel).join(', ')}
          </Typography>
        )}
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            color="inherit"
            onClick={() => setBulkAnchorEl(null)}
          >
            Bekor qilish
          </Button>
          <LoadingButton
            fullWidth
            size="small"
            variant="contained"
            loading={scheduleMenu.isPending}
            disabled={bulkDays.length === 0}
            onClick={handleBulkAssignDays}
          >
            Saqlash
          </LoadingButton>
        </Stack>
      </Popover>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="O'chirish"
        content={`${table.selected.length} ta ovqatni o'chirishni tasdiqlaysizmi?`}
        action={
          <Button variant="contained" color="error" onClick={handleDeleteSelected} disabled={deleteMeal.isPending}>
            {deleteMeal.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </Button>
        }
      />
    </DashboardContent>
  );
}
