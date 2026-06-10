'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import axios, { endpoints } from 'src/lib/axios';
import { uploadImage } from 'src/lib/api/uploads';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const ROLES = [
  { value: 'super_admin', label: 'Bosh admin' },
  { value: 'company_admin', label: 'Kompaniya' },
  { value: 'kitchen_admin', label: 'Oshxona' },
  { value: 'employee', label: 'Xodim' },
];

const Schema = z.object({
  phone: z.string().min(1, { message: 'Telefon kiritilishi shart' }),
  name: z.string().optional(),
  password: z.string().min(6, { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }),
  role: z.string().min(1, { message: 'Rol tanlanishi shart' }),
  company_id: z.string().optional(),
  kitchen_id: z.string().optional(),
  branch_id: z.string().optional(),
  is_active: z.boolean(),
  photo_url: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;
type Company = { id: string; name: string };
type Kitchen = { id: string; name: string };
type Branch = { id: string; name: string };

// ----------------------------------------------------------------------

export function UserCreateEditForm() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get(endpoints.superAdmin.companies).then((r) => setCompanies(r.data?.items ?? r.data ?? [])).catch(() => {});
    axios.get(endpoints.superAdmin.kitchens).then((r) => setKitchens(r.data?.items ?? r.data ?? [])).catch(() => {});
    axios.get(endpoints.superAdmin.branches).then((r) => setBranches(r.data?.items ?? r.data ?? []))  .catch(() => {});
  }, []);

  const methods = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      phone: '',
      name: '',
      password: '',
      role: '',
      company_id: '',
      kitchen_id: '',
      branch_id: '',
      is_active: true,
      photo_url: '',
    },
  });

  const { handleSubmit, watch, setValue, formState: { isSubmitting } } = methods;
  const role = watch('role');
  const isActive = watch('is_active');
  const photoUrl = watch('photo_url');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { url } = await uploadImage(file);
      setValue('photo_url', url, { shouldValidate: true });
    } catch {
      toast.error("Rasm yuklanmadi. Qaytadan urinib ko'ring.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      await axios.post(`/api/v1/super-admin/users`, {
        phone: data.phone,
        name: data.name || null,
        password: data.password,
        role: data.role,
        status: data.is_active ? 'active' : 'pending',
        company_id: data.company_id || null,
        kitchen_id: data.kitchen_id || null,
        branch_id: data.branch_id || null,
        photo_url: data.photo_url || null,
      });
      toast.success("Foydalanuvchi yaratildi!");
      router.push(paths.dashboard.user.list);
    } catch (err: any) {
      toast.error(err?.message || 'Xatolik yuz berdi');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        {/* Left card — avatar + active toggle */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ pt: 10, pb: 5, px: 3, textAlign: 'center' }}>
            {/* Avatar upload */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <Tooltip title={photoUrl ? "Rasmni almashtirish" : "Rasm yuklash"}>
              <Box
                onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                sx={{
                  mx: 'auto',
                  mb: 3,
                  width: 144,
                  height: 144,
                  borderRadius: '50%',
                  position: 'relative',
                  cursor: avatarUploading ? 'default' : 'pointer',
                  '&:hover .avatar-overlay': { opacity: 1 },
                }}
              >
                <Avatar
                  src={photoUrl || undefined}
                  sx={{
                    width: 144,
                    height: 144,
                    bgcolor: 'background.neutral',
                    border: '1px dashed',
                    borderColor: 'divider',
                    fontSize: 48,
                  }}
                >
                  {!photoUrl && (
                    <Box
                      component="img"
                      src="/assets/icons/files/ic-img.svg"
                      sx={{ width: 36, height: 36, opacity: 0.4 }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </Avatar>

                {/* Hover / loading overlay */}
                <Box
                  className="avatar-overlay"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    bgcolor: 'rgba(0,0,0,0.48)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    opacity: avatarUploading ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {avatarUploading ? (
                    <CircularProgress size={28} sx={{ color: '#fff' }} />
                  ) : (
                    <>
                      <Box
                        component="img"
                        src="/assets/icons/files/ic-img.svg"
                        sx={{ width: 28, height: 28, filter: 'brightness(10)' }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#fff', lineHeight: 1.2 }}>
                        Yuklash
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            </Tooltip>

            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 5 }}>
              {photoUrl
                ? "Rasmni almashtirish uchun bosing"
                : "JPG, PNG. Maksimal 5 MB"}
            </Typography>

            <Divider sx={{ mb: 3 }} />

            {/* Active toggle */}
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
                  <Typography variant="subtitle2">
                    Foydalanuvchi faol
                  </Typography>
                }
                labelPlacement="start"
                sx={{ justifyContent: 'space-between', ml: 0, width: '100%' }}
              />
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                O'chirilsa, foydalanuvchi tizimga kira olmaydi
              </Typography>
            </Stack>
          </Card>
        </Grid>

        {/* Right card — form fields */}
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
              {/* Full name — full width */}
              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <Field.Text
                  name="name"
                  label="To'liq ism"
                  placeholder="Ism familiya"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              {/* Password — full width */}
              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <Field.Text
                  name="password"
                  label="Parol"
                  type="password"
                  placeholder="••••••"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              {/* Phone */}
              <Field.Phone name="phone" label="Telefon raqami" country="UZ" />

              {/* Role */}
              <Field.Select
                name="role"
                label="Rol"
                slotProps={{ inputLabel: { shrink: true } }}
              >
                <MenuItem value="">— Tanlang —</MenuItem>
                {ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Field.Select>

              {/* Company — company_admin or employee */}
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

              {/* Kitchen — kitchen_admin */}
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

              {/* Branch — employee */}
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
                Foydalanuvchi yaratish
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
