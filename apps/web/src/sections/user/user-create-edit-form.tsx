'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import axios, { endpoints } from 'src/lib/axios';
import { uploadImage } from 'src/lib/api/uploads';
import { getImagePreviewUrl } from 'src/lib/image-url';

import { toast } from 'src/components/snackbar';
import { UploadAvatar } from 'src/components/upload';
import { Form, Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const ROLES = [
  { value: 'super_admin', label: 'Bosh admin' },
  { value: 'company_admin', label: 'Kompaniya' },
  { value: 'kitchen_admin', label: 'Oshxona' },
  { value: 'employee', label: 'Xodim' },
];

const STATUSES = [
  { value: 'approved', label: 'Faol' },
  { value: 'pending_approval', label: 'Kutmoqda' },
  { value: 'inactive', label: 'Faolsiz' },
  { value: 'rejected', label: 'Rad etilgan' },
];

const Schema = z.object({
  phone: z.string().min(1, { message: 'Telefon kiritilishi shart' }),
  name: z.string().optional(),
  role: z.string().min(1, { message: 'Rol tanlanishi shart' }),
  company_id: z.string().optional(),
  kitchen_id: z.string().optional(),
  branch_id: z.string().optional(),
  is_active: z.boolean(),
  status: z.string().optional(),
  avatar_url: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;
type Company = { id: string; name: string };
type Kitchen = { id: string; name: string };
type Branch = { id: string; name: string };

type Props = { userId: string };

// ----------------------------------------------------------------------

export function UserCreateEditForm({ userId }: Props) {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [initialAvatarUrl, setInitialAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const methods = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      phone: '',
      name: '',
      role: '',
      company_id: '',
      kitchen_id: '',
      branch_id: '',
      is_active: true,
      status: 'approved',
      avatar_url: '',
    },
  });

  const { handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = methods;
  const role = watch('role');
  const isActive = watch('is_active');
  const avatarUrl = watch('avatar_url');

  useEffect(() => {
    axios.get(endpoints.superAdmin.companies).then((r) => setCompanies(r.data?.items ?? r.data ?? [])).catch(() => {});
    axios.get(endpoints.superAdmin.kitchens).then((r) => setKitchens(r.data?.items ?? r.data ?? [])).catch(() => {});
    axios.get(endpoints.superAdmin.branches).then((r) => setBranches(r.data?.items ?? r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingUser(true);
    axios
      .get(endpoints.superAdmin.user(userId))
      .then((r) => {
        const u = r.data;
        const nextAvatarUrl = u.avatar_url ?? u.photo_url ?? '';
        setInitialAvatarUrl(nextAvatarUrl);
        setAvatarFile(null);
        reset({
          phone: u.phone ?? '',
          name: u.name ?? '',
          role: u.role ?? '',
          company_id: u.company_id ?? '',
          kitchen_id: u.kitchen_id ?? '',
          branch_id: u.branch_id ?? '',
          is_active: u.is_active ?? true,
          status: u.account_status ?? 'approved',
          avatar_url: nextAvatarUrl,
        });
      })
      .catch(() => toast.error("Foydalanuvchi ma'lumotlari yuklanmadi"))
      .finally(() => setLoadingUser(false));
  }, [userId, reset]);

  const handleDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarUploading(true);
    try {
      const { url } = await uploadImage(file, 'avatars');
      setValue('avatar_url', url, { shouldDirty: true, shouldValidate: true });
    } catch {
      toast.error("Rasm yuklanmadi. Qaytadan urinib ko'ring.");
      setAvatarFile(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(endpoints.superAdmin.user(userId));
      toast.success("Foydalanuvchi o'chirildi");
      router.push(paths.dashboard.user.list);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const requestedAvatarUrl = data.avatar_url || '';
      const avatarChanged = requestedAvatarUrl !== initialAvatarUrl;
      const response = await axios.patch(endpoints.superAdmin.user(userId), {
        name: data.name || null,
        phone: data.phone,
        role: data.role,
        is_active: data.is_active,
        account_status: data.status || null,
        company_id: data.company_id || null,
        kitchen_id: data.kitchen_id || null,
        branch_id: data.branch_id || null,
        avatar_url: data.avatar_url || null,
      });

      if (avatarChanged && (response.data?.avatar_url ?? '') !== requestedAvatarUrl) {
        throw new Error("Backend foydalanuvchi rasmini saqlamadi. Super-admin update API'ga avatar_url qo'shilishi kerak.");
      }

      toast.success('Foydalanuvchi yangilandi!');
      router.push(paths.dashboard.user.list);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    }
  });

  if (loadingUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          {/* Left card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ pt: 6, pb: 5, px: 3, textAlign: 'center' }}>
              <UploadAvatar
                value={avatarFile ?? (avatarUrl ? getImagePreviewUrl(avatarUrl) : null)}
                loading={avatarUploading}
                onDrop={handleDrop}
                sx={{ mb: 1 }}
              />

              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 4 }}>
                Ruxsat etilgan *.jpeg, *.jpg, *.png, *.gif.
                <br />
                Maksimal hajm: 3 MB
              </Typography>

              <Divider sx={{ mb: 3 }} />

              <Stack spacing={1} sx={{ textAlign: 'left', px: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActive}
                      onChange={(e) => setValue('is_active', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="subtitle2">Foydalanuvchi faol</Typography>
                  }
                  labelPlacement="start"
                  sx={{ justifyContent: 'space-between', ml: 0, width: '100%' }}
                />
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  O&apos;chirilsa, foydalanuvchi tizimga kira olmaydi
                </Typography>
              </Stack>

              <Divider sx={{ my: 3 }} />
              <Button
                variant="soft"
                color="error"
                onClick={() => setDeleteOpen(true)}
                sx={{ px: 4, minWidth: 140 }}
              >
                O&apos;chirish
              </Button>
            </Card>
          </Grid>

          {/* Right card */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  columnGap: 2,
                  rowGap: 3,
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                }}
              >
                <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                  <Field.Text
                    name="name"
                    label="To'liq ism"
                    placeholder="Ism familiya"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>

                <Field.Phone name="phone" label="Telefon raqami" country="UZ" />

                <Field.Select
                  name="role"
                  label="Rol"
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  <MenuItem value="">— Tanlang —</MenuItem>
                  {ROLES.map((r) => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </Field.Select>

                <Field.Select
                  name="status"
                  label="Holat"
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  {STATUSES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Field.Select>

                {(role === 'company_admin' || role === 'employee') && (
                  <Field.Select
                    name="company_id"
                    label="Kompaniya"
                    slotProps={{ inputLabel: { shrink: true } }}
                  >
                    <MenuItem value="">— Tanlang —</MenuItem>
                    {companies.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Field.Select>
                )}

                {role === 'kitchen_admin' && (
                  <Field.Select
                    name="kitchen_id"
                    label="Oshxona"
                    slotProps={{ inputLabel: { shrink: true } }}
                  >
                    <MenuItem value="">— Tanlang —</MenuItem>
                    {kitchens.map((k) => (
                      <MenuItem key={k.id} value={k.id}>{k.name}</MenuItem>
                    ))}
                  </Field.Select>
                )}

                {role === 'employee' && (
                  <Field.Select
                    name="branch_id"
                    label="Filial"
                    slotProps={{ inputLabel: { shrink: true } }}
                  >
                    <MenuItem value="">— Tanlang —</MenuItem>
                    {branches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                    ))}
                  </Field.Select>
                )}
              </Box>

              <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={isSubmitting}
                  size="large"
                >
                  Saqlash
                </LoadingButton>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Form>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Foydalanuvchini o'chirish"
        content="Ushbu foydalanuvchini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi."
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={deleting}
            onClick={handleDelete}
          >
            O&apos;chirish
          </LoadingButton>
        }
      />
    </>
  );
}
