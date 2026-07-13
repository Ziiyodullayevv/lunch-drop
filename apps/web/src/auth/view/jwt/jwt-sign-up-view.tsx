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

import { useTranslate } from 'src/locales';
import axios, { endpoints } from 'src/lib/axios';

import { Form, Field } from 'src/components/hook-form';
import { Iconify, type IconifyName } from 'src/components/iconify';
import {
  Map,
  MapControls,
  MapLocateButton,
  type GeolocateCoords,
  reverseGeocodeAddress,
  MapAddressAutocomplete,
  type MapAddressSuggestion,
} from 'src/components/map';

import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;
const SIGNUP_SESSION_TTL_MS = 15 * 60 * 1000;

// Step 1: Phone + OTP
const createSchemas = (t: (key: string) => string) => ({
  step1: z.object({ phone: z.string().min(1, { message: t('auth.phoneRequired') }) }),
  step2: z.object({ code: z.string().length(6, { message: t('auth.codeRequired') }) }),
  step3: z.object({
    full_name: z.string().min(1, { message: t('auth.fullNameRequired') }),
    password: z.string().min(6, { message: t('auth.passwordShort') }),
    confirm_password: z.string().min(1, { message: t('auth.confirmPasswordRequired') }),
    name: z.string().min(1, { message: t('auth.organizationNameRequired') }), description: z.string().optional(), institution_phone: z.string().optional(), lat: z.number().optional(), lng: z.number().optional(),
  }).refine((data) => data.password === data.confirm_password, { path: ['confirm_password'], message: t('auth.passwordsMismatch') }),
});

// Step 2: OTP verify
type Step1Values = z.infer<ReturnType<typeof createSchemas>['step1']>;
type Step2Values = z.infer<ReturnType<typeof createSchemas>['step2']>;
type Step3Values = z.infer<ReturnType<typeof createSchemas>['step3']>;
type RegisterStep = 'phone' | 'otp' | 'personal' | 'organization' | 'location';

// ----------------------------------------------------------------------

function RegisterFlow({
  role,
  onLockChange,
}: {
  role: 'kitchen_admin' | 'company_admin';
  onLockChange: (locked: boolean) => void;
}) {
  const { t } = useTranslate('common');
  const schemas = createSchemas(t);
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
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const reverseLookupId = useRef(0);

  const step1 = useForm<Step1Values>({ resolver: zodResolver(schemas.step1), defaultValues: { phone: '' } });
  const step2 = useForm<Step2Values>({ resolver: zodResolver(schemas.step2), defaultValues: { code: '' } });
  const step3 = useForm<Step3Values>({
    resolver: zodResolver(schemas.step3),
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

  const { setValue: setStep1Value } = step1;
  const { setValue: setStep3Value } = step3;
  const signupSessionKey = `lunchdrop-admin-signup:${role}`;

  useEffect(() => {
    try {
      const savedSession = window.sessionStorage.getItem(signupSessionKey);

      if (!savedSession) return;

      const parsed = JSON.parse(savedSession) as {
        phone?: string;
        telegramUrl?: string;
        savedAt?: number;
      };

      const isExpired = !parsed.savedAt || Date.now() - parsed.savedAt > SIGNUP_SESSION_TTL_MS;

      if (!parsed.phone || isExpired) {
        window.sessionStorage.removeItem(signupSessionKey);
        return;
      }

      setPhone(parsed.phone);
      setTelegramUrl(parsed.telegramUrl ?? '');
      setStep1Value('phone', parsed.phone);
      setActiveStep('otp');
    } catch {
      window.sessionStorage.removeItem(signupSessionKey);
    }
  }, [setStep1Value, signupSessionKey]);

  const handleMapMoveEnd = useCallback(
    async (nextViewState: ViewState) => {
      const { latitude, longitude } = nextViewState;
      setMarker({ latitude, longitude });
      setStep3Value('lat', latitude, { shouldDirty: true, shouldValidate: true });
      setStep3Value('lng', longitude, { shouldDirty: true, shouldValidate: true });
      setHasLocation(true);
      setIsMapMoving(false);
      const lookupId = ++reverseLookupId.current;
      setIsResolvingAddress(true);
      try {
        const address = await reverseGeocodeAddress(latitude, longitude);
        if (lookupId === reverseLookupId.current && address?.label) {
          setAddressSearch(address.label);
        }
      } finally {
        if (lookupId === reverseLookupId.current) setIsResolvingAddress(false);
      }
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
      const nextTelegramUrl = response.data.telegram_url ?? '';

      setPhone(data.phone);
      setTelegramUrl(nextTelegramUrl);
      window.sessionStorage.setItem(
        signupSessionKey,
        JSON.stringify({ phone: data.phone, telegramUrl: nextTelegramUrl, savedAt: Date.now() })
      );
      setActiveStep('otp');
    } catch (err) { setError(getErrorMessage(err)); }
  });

  const openTelegramApp = useCallback(() => {
    if (!telegramUrl) return;

    const link = document.createElement('a');
    link.href = telegramUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
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
        window.sessionStorage.removeItem(signupSessionKey);
        setActiveStep('personal');
      } catch (err) {
        const status = typeof err === 'object' && err !== null ? (err as { status?: number }).status : undefined;
        setError(status === 401 ? t('auth.invalidCode') : getErrorMessage(err));
      } finally {
        setIsOtpVerifying(false);
      }
    },
    [isOtpVerifying, phone, signupSessionKey, t]
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
      setError(t('auth.locationRequired'));
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
    { key: 'phone', label: t('auth.phoneStep'), icon: 'solar:phone-bold' },
    { key: 'otp', label: t('auth.verification'), icon: 'solar:shield-check-bold' },
    { key: 'personal', label: t('auth.profile'), icon: 'solar:user-rounded-bold' },
    {
      key: 'organization',
      label: role === 'kitchen_admin' ? t('auth.kitchen') : t('auth.company'),
      icon: role === 'kitchen_admin' ? 'solar:cup-star-bold' : 'solar:home-angle-bold-duotone',
    },
  ];

  if (role === 'kitchen_admin') {
    flowSteps.push({ key: 'location', label: t('auth.location'), icon: 'mingcute:location-fill' });
  }

  const activeStepIndex = flowSteps.findIndex((item) => item.key === activeStep);

  const handleBack = () => {
    setError(null);

    const prevStep = flowSteps[activeStepIndex - 1]?.key;

    if (prevStep) {
      if (activeStep === 'otp') {
        window.sessionStorage.removeItem(signupSessionKey);
      }
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
          {t('auth.success')}
        </Alert>

        <Button
          fullWidth
          size="large"
          variant="contained"
          component={RouterLink}
          href={paths.auth.jwt.signIn}
        >
          {t('auth.returnToSignIn')}
        </Button>
      </Stack>
    );
  }

  const entityLabel = role === 'kitchen_admin' ? t('auth.kitchenName') : t('auth.companyName');
  const isDetailsStep = activeStep === 'personal' || activeStep === 'organization' || activeStep === 'location';
  const isFinalStep = (activeStep === 'organization' && role === 'company_admin') || activeStep === 'location';
  const isLocationSubmitDisabled =
    role === 'kitchen_admin' &&
    activeStep === 'location' &&
    (!hasLocation || isMapMoving || isResolvingAddress);

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
          borderRadius: 1,
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
            <Field.Phone name="phone" label={t('auth.phone')} placeholder={t('auth.phonePlaceholder')} country="UZ" />
            <Button
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              loading={step1.formState.isSubmitting}
              sx={{ borderRadius: 1 }}
            >
              {t('auth.sendViaTelegram')}
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
                borderRadius: 1,
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
                  }}
                >
                  <Iconify width={25} icon="solar:chat-round-dots-bold" />
                </Box>

                <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1">{t('auth.telegramCodeTitle')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('auth.telegramCodeWithPhone', { phone })}
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
                    borderRadius: 1,
                    bgcolor: '#229ED9',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#1689C2', boxShadow: 'none' },
                  }}
                >
                  {t('auth.openBot')}
                </Button>
              )}
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
                {t('auth.enterTelegramCode')}
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
                  borderRadius: 1,
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
                borderRadius: 1,
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              {t('auth.back')}
            </Button>
          </Stack>
        </Form>
      )}

      {isDetailsStep && (
        <Form methods={step3} onSubmit={handleDetailsSubmit}>
          <Stack spacing={2.5}>
            {activeStep === 'personal' && (
              <>
                <Field.Text name="full_name" label={t('auth.fullName')} slotProps={{ inputLabel: { shrink: true } }} />

                <Field.Text
                  name="password"
                  label={t('auth.password')}
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
                  label={t('auth.confirmPassword')}
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
                <Field.Text name="description" label={t('auth.description')} multiline rows={2} slotProps={{ inputLabel: { shrink: true } }} />
                <Field.Phone name="institution_phone" label={t('auth.organizationPhone')} country="UZ" />
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
                  label={t('auth.searchAddress')}
                />

                <Box sx={{ position: 'relative' }}>
                  <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={(evt) => setViewState(evt.viewState)}
                    onMoveStart={() => setIsMapMoving(true)}
                    onMoveEnd={(evt) => handleMapMoveEnd(evt.viewState)}
                    sx={{ height: 320, borderRadius: 1, overflow: 'hidden' }}
                  >
                    <MapControls hideGeolocate />
                  </Map>

                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 30,
                      height: 43,
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
                        width: 12,
                        height: 4,
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
                        bottom: 3,
                        width: 2,
                        height: 16,
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
                        width: 30,
                        height: 30,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50% 50% 48% 48%',
                        bgcolor: '#7600FF',
                        border: '2px solid #FFFFFF',
                        boxShadow: '0 4px 11px rgba(118, 0, 255, 0.26)',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#FFFFFF' }} />
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
                    borderRadius: 1,
                    color: hasLocation ? 'success.dark' : 'text.secondary',
                    bgcolor: hasLocation ? 'success.lighter' : 'background.neutral',
                  }}
                >
                  <Iconify icon={hasLocation ? 'eva:checkmark-fill' : 'mingcute:location-fill'} />
                  <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 600 }}>
                    {hasLocation
                      ? t('auth.locationSet')
                      : t('auth.locationHint')}
                  </Typography>
                </Stack>
              </Stack>
            )}

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack direction="row" spacing={1.5}>
              <Button fullWidth size="large" color="inherit" variant="outlined" onClick={handleBack}>
                {t('auth.back')}
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
                  {t('auth.submitApplication')}
                </Button>
              ) : (
                <Button fullWidth size="large" type="button" variant="contained" onClick={handleDetailsNext}>
                  {t('auth.continue')}
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
  const { t } = useTranslate('common');
  const [tab, setTab] = useState<'kitchen' | 'company'>('kitchen');
  const [roleLocked, setRoleLocked] = useState(false);
  const handleRoleLockChange = useCallback((locked: boolean) => {
    setRoleLocked(locked);
  }, []);

  return (
    <>
      <FormHead
        title={t('auth.signUpTitle')}
        description={
          <>
            {t('auth.signUpDescription')}{' '}
            <Link component={RouterLink} href={paths.auth.jwt.signIn} variant="subtitle2">
              {t('auth.signIn')}
            </Link>
          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      <Box
        sx={{
          p: 0.75,
          mb: 3,
          borderRadius: 1,
          bgcolor: 'background.neutral',
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
              borderRadius: 1,
              color: 'text.secondary',
              transition: (theme) => theme.transitions.create(['background-color', 'color', 'box-shadow']),
            },
            '& .Mui-selected': {
              color: 'text.primary',
              bgcolor: 'background.paper',
            },
          }}
        >
          <Tab value="kitchen" label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:cup-star-bold" /> {t('auth.kitchenAdmin')}
            </Box>
          } disabled={roleLocked && tab !== 'kitchen'} />
          <Tab value="company" label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:home-angle-bold-duotone" /> {t('auth.companyAdmin')}
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
