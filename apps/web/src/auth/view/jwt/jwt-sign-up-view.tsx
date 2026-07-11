'use client';

import type { FormEvent } from 'react';
import type { MapRef, ViewState } from 'react-map-gl/maplibre';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Step from '@mui/material/Step';
import Link from '@mui/material/Link';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stepper from '@mui/material/Stepper';
import StepLabel from '@mui/material/StepLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import axios, { endpoints } from 'src/lib/axios';

import { Form, Field } from 'src/components/hook-form';
import { Iconify, type IconifyName } from 'src/components/iconify';
import {
  Map,
  MapControls,
  MapLocateButton,
  type GeolocateCoords,
  MapAddressAutocomplete,
  type MapAddressSuggestion,
} from 'src/components/map';

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
  code: z.string().length(6, { message: '6 xonali kodni kiriting' }),
});

// Step 3: Register details
const Step3Schema = z
  .object({
    full_name:         z.string().min(1, { message: 'Ism majburiy' }),
    password:          z.string().min(6, { message: 'Parol kamida 6 ta belgi' }),
    confirm_password:  z.string().min(1, { message: 'Parolni tasdiqlang' }),
    name:              z.string().min(1, { message: 'Tashkilot nomi majburiy' }),
    description:       z.string().optional(),
    institution_phone: z.string().optional(),
    lat:               z.number().optional(),
    lng:               z.number().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Parollar mos emas',
  });

type Step1Values = z.infer<typeof Step1Schema>;
type Step2Values = z.infer<typeof Step2Schema>;
type Step3Values = z.infer<typeof Step3Schema>;
type RegisterStep = 'phone' | 'otp' | 'personal' | 'organization' | 'location';

// ----------------------------------------------------------------------

function RegisterFlow({
  role,
  onLockChange,
}: {
  role: 'kitchen_admin' | 'company_admin';
  onLockChange: (locked: boolean) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const submittedOtpRef = useRef('');
  const [activeStep, setActiveStep] = useState<RegisterStep>('phone');
  const [phone, setPhone] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [regToken, setRegToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone]   = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const showPassword = useBoolean();

  // Map state — only used when role === 'kitchen_admin'
  const [marker, setMarker]       = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [viewState, setViewState] = useState<Partial<ViewState>>({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, zoom: 12 });
  const [hasLocation, setHasLocation] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');

  const step1 = useForm<Step1Values>({ resolver: zodResolver(Step1Schema), defaultValues: { phone: '' } });
  const step2 = useForm<Step2Values>({ resolver: zodResolver(Step2Schema), defaultValues: { code: '' } });
  const step3 = useForm<Step3Values>({
    resolver: zodResolver(Step3Schema),
    defaultValues: {
      full_name: '',
      password: '',
      confirm_password: '',
      name: '',
      description: '',
      institution_phone: '',
      lat: undefined,
      lng: undefined,
    },
  });

  const { setValue: setStep3Value } = step3;

  const handleMapMoveEnd = useCallback(
    (nextViewState: ViewState) => {
      const { latitude, longitude } = nextViewState;
      setMarker({ latitude, longitude });
      setStep3Value('lat', latitude, { shouldDirty: true, shouldValidate: true });
      setStep3Value('lng', longitude, { shouldDirty: true, shouldValidate: true });
      setHasLocation(true);
      setIsMapMoving(false);
    },
    [setStep3Value]
  );

  const handleLocate = useCallback(
    ({ latitude, longitude }: GeolocateCoords) => {
      setMarker({ latitude, longitude });
      setViewState((prev) => ({ ...prev, latitude, longitude, zoom: 15 }));
      setStep3Value('lat', latitude, { shouldDirty: true, shouldValidate: true });
      setStep3Value('lng', longitude, { shouldDirty: true, shouldValidate: true });
      setHasLocation(true);
    },
    [setStep3Value]
  );

  const handleAddressSelect = useCallback(
    (suggestion: MapAddressSuggestion) => {
      setAddressSearch(suggestion.label);
      handleLocate({ latitude: suggestion.lat, longitude: suggestion.lng });
      mapRef.current?.flyTo({
        center: [suggestion.lng, suggestion.lat],
        zoom: 16,
        duration: 900,
      });
    },
    [handleLocate]
  );

  const onStep1 = step1.handleSubmit(async (data) => {
    try {
      setError(null);
      const response = await axios.post(endpoints.auth.sendOtp, { phone: data.phone });
      setPhone(data.phone);
      setTelegramUrl(response.data.telegram_url ?? '');
      setActiveStep('otp');
    } catch (err) { setError(getErrorMessage(err)); }
  });

  const openTelegramApp = useCallback(() => {
    if (!telegramUrl) return;
    const url = new URL(telegramUrl);
    const start = url.searchParams.get('start');
    const username = url.pathname.replace(/^\//, '');
    const appUrl = `tg://resolve?domain=${encodeURIComponent(username)}${start ? `&start=${encodeURIComponent(start)}` : ''}`;

    window.location.href = appUrl;
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') window.location.href = telegramUrl;
    }, 1200);
  }, [telegramUrl]);

  const verifyOtp = useCallback(
    async (code: string) => {
      if (!phone || isOtpVerifying) {
        return;
      }

      try {
        setError(null);
        setIsOtpVerifying(true);
        const res = await axios.post(endpoints.auth.verifyOtp, { phone, code });
        setRegToken(res.data.registration_token);
        setActiveStep('personal');
      } catch (err) {
        const status = typeof err === 'object' && err !== null ? (err as { status?: number }).status : undefined;
        setError(status === 401 ? 'Tasdiqlash kodi noto‘g‘ri. Qayta urinib ko‘ring.' : getErrorMessage(err));
      } finally {
        setIsOtpVerifying(false);
      }
    },
    [isOtpVerifying, phone]
  );

  const onStep2 = step2.handleSubmit(async (data) => {
    await verifyOtp(data.code);
  });

  const otpCode = step2.watch('code');

  useEffect(() => {
    onLockChange(activeStep !== 'phone');
  }, [activeStep, onLockChange]);

  useEffect(() => {
    if (activeStep !== 'otp' || otpCode.length !== 6 || submittedOtpRef.current === otpCode) {
      return;
    }

    submittedOtpRef.current = otpCode;
    void verifyOtp(otpCode);
  }, [activeStep, otpCode, verifyOtp]);

  const onStep3 = step3.handleSubmit(async (data) => {
    if (role === 'kitchen_admin' && (!hasLocation || data.lat == null || data.lng == null)) {
      setError('Oshxona joylashuvini xaritada belgilang.');
      return;
    }

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
        ...(role === 'kitchen_admin' && { lat: data.lat, lng: data.lng }),
      });
      setDone(true);
    } catch (err) { setError(getErrorMessage(err)); }
  });

  const flowSteps: { key: RegisterStep; label: string; icon: IconifyName }[] = [
    { key: 'phone', label: 'Telefon', icon: 'solar:phone-bold' },
    { key: 'otp', label: 'Tasdiqlash', icon: 'solar:shield-check-bold' },
    { key: 'personal', label: 'Profil', icon: 'solar:user-rounded-bold' },
    {
      key: 'organization',
      label: role === 'kitchen_admin' ? 'Oshxona' : 'Kompaniya',
      icon: role === 'kitchen_admin' ? 'solar:cup-star-bold' : 'solar:home-angle-bold-duotone',
    },
  ];

  if (role === 'kitchen_admin') {
    flowSteps.push({ key: 'location', label: 'Joylashuv', icon: 'mingcute:location-fill' });
  }

  const activeStepIndex = flowSteps.findIndex((item) => item.key === activeStep);

  const handleBack = () => {
    setError(null);

    const prevStep = flowSteps[activeStepIndex - 1]?.key;

    if (prevStep) {
      setActiveStep(prevStep);
    }
  };

  const handleDetailsNext = async () => {
    setError(null);

    const fieldsByStep: Partial<Record<RegisterStep, (keyof Step3Values)[]>> = {
      personal: ['full_name', 'password', 'confirm_password'],
      organization: ['name', 'description', 'institution_phone'],
    };

    const fields = fieldsByStep[activeStep];
    const isValid = fields ? await step3.trigger(fields) : true;

    if (!isValid) {
      return;
    }

    const nextStep = flowSteps[activeStepIndex + 1]?.key;

    if (nextStep) {
      setActiveStep(nextStep);
    }
  };

  if (done) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="success">
          Arizangiz qabul qilindi. Ma&apos;lumotlar tekshirilib, akkauntingiz tasdiqlangach
          tizimga kirishingiz mumkin bo&apos;ladi.
        </Alert>

        <Button
          fullWidth
          size="large"
          variant="contained"
          component={RouterLink}
          href={paths.auth.jwt.signIn}
        >
          Login qismiga qaytish
        </Button>
      </Stack>
    );
  }

  const entityLabel = role === 'kitchen_admin' ? 'Oshxona nomi' : 'Kompaniya nomi';
  const isDetailsStep = activeStep === 'personal' || activeStep === 'organization' || activeStep === 'location';
  const isFinalStep = (activeStep === 'organization' && role === 'company_admin') || activeStep === 'location';
  const isLocationSubmitDisabled = role === 'kitchen_admin' && activeStep === 'location' && !hasLocation;

  const handleDetailsSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (isFinalStep) {
      void onStep3();
      return;
    }

    void handleDetailsNext();
  };

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      <Stack
        spacing={1.5}
        sx={{
          px: { xs: 1, sm: 2 },
          py: 2,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 2.5,
          bgcolor: 'background.neutral',
        }}
      >
        <Stepper
          activeStep={activeStepIndex}
          alternativeLabel
          sx={{
            mx: { xs: -1, sm: 0 },
            '& .MuiStepConnector-root.MuiStepConnector-alternativeLabel': {
              top: 18,
              left: 'calc(-50% + 26px)',
              right: 'calc(50% + 26px)',
            },
            '& .MuiStepConnector-line': { borderColor: 'divider' },
            '& .MuiStepLabel-label': {
              mt: 0.75,
              typography: 'caption',
              color: 'text.disabled',
              whiteSpace: 'nowrap',
              display: { xs: 'none', sm: 'block' },
            },
            '& .Mui-active .MuiStepLabel-label': { color: 'text.primary', fontWeight: 700 },
            '& .Mui-completed .MuiStepLabel-label': { color: 'text.secondary' },
          }}
        >
          {flowSteps.map((item) => (
            <Step key={item.key}>
              <StepLabel
                slots={{
                  stepIcon: ({ active, completed }) => (
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        display: 'flex',
                        borderRadius: '50%',
                        alignItems: 'center',
                        color: 'text.disabled',
                        bgcolor: 'action.hover',
                        justifyContent: 'center',
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        ...(active && {
                          color: 'primary.contrastText',
                          bgcolor: 'primary.main',
                          borderColor: 'primary.main',
                          boxShadow: (theme) => `0 8px 16px ${theme.palette.primary.main}29`,
                        }),
                        ...(completed && {
                          color: 'primary.main',
                          bgcolor: 'primary.lighter',
                          borderColor: 'primary.light',
                        }),
                      }}
                    >
                      <Iconify width={16} icon={completed ? 'eva:checkmark-fill' : item.icon} />
                    </Box>
                  ),
                }}
              >
                {item.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Stack>

      {activeStep === 'phone' && (
        <Form methods={step1} onSubmit={onStep1}>
          <Stack spacing={2.5}>
            <Field.Phone name="phone" label="Telefon raqam" country="UZ" />
            <Button
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              loading={step1.formState.isSubmitting}
              sx={{ borderRadius: 2.5 }}
            >
              Telegram orqali davom etish
            </Button>
          </Stack>
        </Form>
      )}

      {activeStep === 'otp' && (
        <Form methods={step2} onSubmit={onStep2}>
          <Stack spacing={2.5}>
            <Stack
              spacing={2.25}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                border: '1px solid rgba(34, 158, 217, 0.22)',
                bgcolor: 'rgba(34, 158, 217, 0.07)',
              }}
            >
              <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    color: '#fff',
                    bgcolor: '#229ED9',
                    boxShadow: '0 8px 20px rgba(34, 158, 217, 0.24)',
                  }}
                >
                  <Iconify width={25} icon="solar:chat-round-dots-bold" />
                </Box>

                <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1">Kod Telegram bot orqali beriladi</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Botda{' '}
                    <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                      {phone}
                    </Box>{' '}
                    raqamingizni tasdiqlang.
                  </Typography>
                </Stack>
              </Stack>

              {telegramUrl && (
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  onClick={openTelegramApp}
                  startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
                  sx={{
                    flexShrink: 0,
                    borderRadius: 2.5,
                    bgcolor: '#229ED9',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#1689C2', boxShadow: 'none' },
                  }}
                >
                  Botni ochish
                </Button>
              )}
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
                Bot yuborgan 6 xonali kodni kiriting
              </Typography>
            <Field.Code
              name="code"
              maxSize={52}
              placeholder=""
              slotProps={{
                wrapper: { sx: { width: 1 } },
                textField: {
                  type: 'tel',
                  disabled: isOtpVerifying,
                },
              }}
              sx={{
                gap: { xs: 0.75, sm: 1.25 },
                justifyContent: 'center',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                },
              }}
            />
            </Stack>
            <Button
              fullWidth
              size="large"
              color="inherit"
              variant="soft"
              onClick={handleBack}
              sx={{
                borderRadius: 2.5,
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              Orqaga
            </Button>
          </Stack>
        </Form>
      )}

      {isDetailsStep && (
        <Form methods={step3} onSubmit={handleDetailsSubmit}>
          <Stack spacing={2.5}>
            {activeStep === 'personal' && (
              <>
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

                <Field.Text
                  name="confirm_password"
                  label="Parolni tasdiqlash"
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
              </>
            )}

            {activeStep === 'organization' && (
              <>
                <Field.Text name="name" label={entityLabel} slotProps={{ inputLabel: { shrink: true } }} />
                <Field.Text name="description" label="Tavsif (ixtiyoriy)" multiline rows={2} slotProps={{ inputLabel: { shrink: true } }} />
                <Field.Phone name="institution_phone" label="Tashkilot telefoni (ixtiyoriy)" country="UZ" />
              </>
            )}

            {activeStep === 'location' && role === 'kitchen_admin' && (
              <Stack spacing={1}>
                <MapAddressAutocomplete
                  value={addressSearch}
                  onChange={setAddressSearch}
                  onSelect={handleAddressSelect}
                  latitude={marker.latitude}
                  longitude={marker.longitude}
                  label="Manzil qidirish"
                />

                <Box sx={{ position: 'relative' }}>
                  <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={(evt) => setViewState(evt.viewState)}
                    onMoveStart={() => setIsMapMoving(true)}
                    onMoveEnd={(evt) => handleMapMoveEnd(evt.viewState)}
                    sx={{ height: 320, borderRadius: 2.5, overflow: 'hidden' }}
                  >
                    <MapControls hideGeolocate />
                  </Map>

                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 58,
                      height: 78,
                      zIndex: 2,
                      pointerEvents: 'none',
                      transform: `translate(-50%, ${isMapMoving ? '-108%' : '-100%'})`,
                      transition: 'transform 160ms ease-out',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '50%',
                        bottom: 1,
                        width: 22,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: 'rgba(31, 41, 55, 0.20)',
                        filter: 'blur(2px)',
                        transform: 'translateX(-50%)',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '50%',
                        bottom: 6,
                        width: 4,
                        height: 29,
                        borderRadius: 4,
                        bgcolor: '#5B3A78',
                        border: '1px solid rgba(255,255,255,0.65)',
                        transform: 'translateX(-50%)',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        width: 58,
                        height: 58,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50% 50% 48% 48%',
                        bgcolor: '#7600FF',
                        border: '3px solid #FFFFFF',
                        boxShadow: '0 8px 22px rgba(118, 0, 255, 0.34)',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <Box sx={{ width: 13, height: 13, borderRadius: '50%', bgcolor: '#FFFFFF' }} />
                    </Box>
                  </Box>

                  <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    alignItems: 'center',
                    borderRadius: 1.5,
                    color: hasLocation ? 'success.dark' : 'text.secondary',
                    bgcolor: hasLocation ? 'success.lighter' : 'background.neutral',
                  }}
                >
                  <Iconify icon={hasLocation ? 'eva:checkmark-fill' : 'mingcute:location-fill'} />
                  <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 600 }}>
                    {hasLocation
                      ? 'Joylashuv belgilandi. Aniqlashtirish uchun xaritani suring.'
                      : 'Binafsha marker kerakli nuqtada turishi uchun xaritani suring.'}
                  </Typography>
                </Stack>
              </Stack>
            )}

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack direction="row" spacing={1.5}>
              <Button fullWidth size="large" color="inherit" variant="outlined" onClick={handleBack}>
                Orqaga
              </Button>

              {isFinalStep ? (
                <Button
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  disabled={isLocationSubmitDisabled}
                  loading={step3.formState.isSubmitting}
                >
                  Ariza yuborish
                </Button>
              ) : (
                <Button fullWidth size="large" type="button" variant="contained" onClick={handleDetailsNext}>
                  Davom etish
                </Button>
              )}
            </Stack>
          </Stack>
        </Form>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function JwtSignUpView() {
  const [tab, setTab] = useState<'kitchen' | 'company'>('kitchen');
  const [roleLocked, setRoleLocked] = useState(false);
  const handleRoleLockChange = useCallback((locked: boolean) => {
    setRoleLocked(locked);
  }, []);

  return (
    <>
      <FormHead
        title="Ro‘yxatdan o‘tish"
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

      <Box
        sx={{
          p: 0.75,
          mb: 3,
          borderRadius: 2.5,
          bgcolor: 'background.neutral',
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => {
            if (!roleLocked) {
              setTab(v);
            }
          }}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              minHeight: 48,
              borderRadius: 2.5,
              color: 'text.secondary',
              transition: (theme) => theme.transitions.create(['background-color', 'color', 'box-shadow']),
            },
            '& .Mui-selected': {
              color: 'text.primary',
              bgcolor: 'background.paper',
              boxShadow: '0 6px 18px rgba(20, 26, 33, 0.08)',
            },
          }}
        >
          <Tab value="kitchen" label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:cup-star-bold" /> Oshxona admin
            </Box>
          } disabled={roleLocked && tab !== 'kitchen'} />
          <Tab value="company" label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:home-angle-bold-duotone" /> Kompaniya admin
            </Box>
          } disabled={roleLocked && tab !== 'company'} />
        </Tabs>
      </Box>

      {tab === 'kitchen' && (
        <RegisterFlow key="kitchen" role="kitchen_admin" onLockChange={handleRoleLockChange} />
      )}
      {tab === 'company' && (
        <RegisterFlow key="company" role="company_admin" onLockChange={handleRoleLockChange} />
      )}
    </>
  );
}
