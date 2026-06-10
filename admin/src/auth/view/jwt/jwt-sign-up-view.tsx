'use client';

import type { GeolocateResultEvent, ViewState, MarkerDragEvent } from 'react-map-gl/maplibre';

import * as z from 'zod';
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Link from '@mui/material/Link';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import axios, { endpoints } from 'src/lib/axios';

import { Map, MapMarker, MapControls } from 'src/components/map';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

// Step 1: Phone + OTP
const Step1Schema = z.object({
  phone: z.string().min(1, { message: 'Telefon raqam majburiy' }),
});

// Step 2: OTP verify
const Step2Schema = z.object({
  code: z.string().min(4, { message: 'Kod kamida 4 ta raqam' }),
});

// Step 3: Register details
const Step3Schema = z.object({
  full_name:         z.string().min(1, { message: 'Ism majburiy' }),
  password:          z.string().min(6, { message: 'Parol kamida 6 ta belgi' }),
  name:              z.string().min(1, { message: 'Tashkilot nomi majburiy' }),
  description:       z.string().optional(),
  institution_phone: z.string().optional(),
  lat:               z.number().optional(),
  lng:               z.number().optional(),
});

type Step1Values = z.infer<typeof Step1Schema>;
type Step2Values = z.infer<typeof Step2Schema>;
type Step3Values = z.infer<typeof Step3Schema>;

// ----------------------------------------------------------------------

function RegisterFlow({ role }: { role: 'kitchen_admin' | 'company_admin' }) {
  const [step, setStep]   = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [regToken, setRegToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone]   = useState(false);
  const showPassword = useBoolean();

  // Map state — only used when role === 'kitchen_admin'
  const [marker, setMarker]       = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [viewState, setViewState] = useState<Partial<ViewState>>({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, zoom: 12 });
  const [hasLocation, setHasLocation] = useState(false);

  const step1 = useForm<Step1Values>({ resolver: zodResolver(Step1Schema), defaultValues: { phone: '' } });
  const step2 = useForm<Step2Values>({ resolver: zodResolver(Step2Schema), defaultValues: { code: '' } });
  const step3 = useForm<Step3Values>({
    resolver: zodResolver(Step3Schema),
    defaultValues: { full_name: '', password: '', name: '', description: '', institution_phone: '', lat: undefined, lng: undefined },
  });

  const { setValue: setStep3Value } = step3;

  const handleMarkerDragEnd = useCallback(
    (e: MarkerDragEvent) => {
      const { lat: newLat, lng: newLng } = e.lngLat;
      setMarker({ latitude: newLat, longitude: newLng });
      setStep3Value('lat', newLat);
      setStep3Value('lng', newLng);
      setHasLocation(true);
    },
    [setStep3Value]
  );

  const handleGeolocate = useCallback(
    (e: GeolocateResultEvent) => {
      const { latitude, longitude } = e.coords;
      setMarker({ latitude, longitude });
      setViewState((prev) => ({ ...prev, latitude, longitude, zoom: 15 }));
      setStep3Value('lat', latitude);
      setStep3Value('lng', longitude);
      setHasLocation(true);
    },
    [setStep3Value]
  );

  const onStep1 = step1.handleSubmit(async (data) => {
    try {
      setError(null);
      await axios.post(endpoints.auth.sendOtp, { phone: data.phone });
      setPhone(data.phone);
      setStep(2);
    } catch (err) { setError(getErrorMessage(err)); }
  });

  const onStep2 = step2.handleSubmit(async (data) => {
    try {
      setError(null);
      const res = await axios.post(endpoints.auth.verifyOtp, { phone, code: data.code });
      setRegToken(res.data.registration_token);
      setStep(3);
    } catch (err) { setError(getErrorMessage(err)); }
  });

  const onStep3 = step3.handleSubmit(async (data) => {
    try {
      setError(null);
      await axios.post(endpoints.auth.adminRegister, {
        registration_token: regToken,
        role,
        full_name:         data.full_name,
        password:          data.password,
        name:              data.name,
        description:       data.description        || undefined,
        institution_phone: data.institution_phone  || undefined,
        ...(role === 'kitchen_admin' && {
          lat: data.lat ?? 0,
          lng: data.lng ?? 0,
        }),
      });
      setDone(true);
    } catch (err) { setError(getErrorMessage(err)); }
  });

  if (done) {
    return (
      <Alert severity="success">
        Arizangiz qabul qilindi. Super admin ko'rib chiqib tasdiqlaydi.
      </Alert>
    );
  }

  const stepLabel  = { 1: 'Telefon raqam', 2: 'SMS kodni tasdiqlash', 3: "Ma'lumotlar" };
  const entityLabel = role === 'kitchen_admin' ? 'Oshxona nomi' : 'Kompaniya nomi';
  const latVal = step3.watch('lat');
  const lngVal = step3.watch('lng');

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      <Typography variant="caption" color="text.secondary">
        {step}-qadam: {stepLabel[step]}
      </Typography>

      {step === 1 && (
        <Form methods={step1} onSubmit={onStep1}>
          <Stack spacing={2.5}>
            <Field.Phone name="phone" label="Telefon raqam" country="UZ" />
            <Button fullWidth size="large" type="submit" variant="contained" loading={step1.formState.isSubmitting}>
              SMS kod yuborish
            </Button>
          </Stack>
        </Form>
      )}

      {step === 2 && (
        <Form methods={step2} onSubmit={onStep2}>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              {phone} raqamiga kod yuborildi
            </Typography>
            <Field.Text name="code" label="SMS kod" placeholder="123456" slotProps={{ inputLabel: { shrink: true } }} />
            <Button fullWidth size="large" type="submit" variant="contained" loading={step2.formState.isSubmitting}>
              Tasdiqlash
            </Button>
            <Button size="small" color="inherit" onClick={() => setStep(1)}>
              Orqaga
            </Button>
          </Stack>
        </Form>
      )}

      {step === 3 && (
        <Form methods={step3} onSubmit={onStep3}>
          <Stack spacing={2.5}>
            <Divider><Typography variant="caption" color="text.secondary">Shaxsiy ma'lumotlar</Typography></Divider>

            <Field.Text name="full_name" label="Ism Familiya" slotProps={{ inputLabel: { shrink: true } }} />

            <Field.Text
              name="password"
              label="Parol"
              type={showPassword.value ? 'text' : 'password'}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={showPassword.onToggle} edge="end">
                        <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Divider><Typography variant="caption" color="text.secondary">Tashkilot ma'lumotlari</Typography></Divider>

            <Field.Text name="name" label={entityLabel} slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Text name="description" label="Tavsif (ixtiyoriy)" multiline rows={2} slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Phone name="institution_phone" label="Tashkilot telefoni (ixtiyoriy)" country="UZ" />

            {role === 'kitchen_admin' && (
              <>
                <Divider>
                  <Typography variant="caption" color="text.secondary">Joylashuv</Typography>
                </Divider>

                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Xaritadagi joylashuv — markerni sudrab o'rnating *
                  </Typography>

                  <Map
                    {...viewState}
                    onMove={(evt) => setViewState(evt.viewState)}
                    sx={{ height: 280, borderRadius: 2, overflow: 'hidden' }}
                  >
                    <MapControls
                      slotProps={{
                        geolocate: {
                          onGeolocate: handleGeolocate,
                          positionOptions: { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
                        },
                      }}
                    />
                    <MapMarker
                      latitude={marker.latitude}
                      longitude={marker.longitude}
                      draggable
                      anchor="bottom"
                      onDragEnd={handleMarkerDragEnd}
                      sx={{ color: hasLocation ? '#3B82F6' : '#9CA3AF' }}
                    />
                  </Map>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {hasLocation ? (
                      <>
                        <Typography variant="caption" color="text.secondary">Lat: {latVal?.toFixed(6)}</Typography>
                        <Typography variant="caption" color="text.secondary">Lng: {lngVal?.toFixed(6)}</Typography>
                      </>
                    ) : (
                      <Typography variant="caption" color="warning.main">
                        Markerni sudrab oshxona joylashuvini belgilang
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </>
            )}

            <Button fullWidth size="large" type="submit" variant="contained" loading={step3.formState.isSubmitting}>
              Ro'yxatdan o'tish
            </Button>
          </Stack>
        </Form>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function JwtSignUpView() {
  const [tab, setTab] = useState<'kitchen' | 'company'>('kitchen');

  return (
    <>
      <FormHead
        title="Ro'yxatdan o'tish"
        description={
          <>
            Akkauntingiz bormi?{' '}
            <Link component={RouterLink} href={paths.auth.jwt.signIn} variant="subtitle2">
              Kirish
            </Link>
          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Ro'yxatdan o'tgach akkauntingiz <strong>super admin tomonidan tekshiriladi</strong>.
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab value="kitchen" label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:cup-star-bold" /> Oshxona admin
            </Box>
          } />
          <Tab value="company" label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:home-angle-bold-duotone" /> Kompaniya admin
            </Box>
          } />
        </Tabs>
      </Box>

      {tab === 'kitchen' && <RegisterFlow key="kitchen" role="kitchen_admin" />}
      {tab === 'company' && <RegisterFlow key="company" role="company_admin" />}
    </>
  );
}
