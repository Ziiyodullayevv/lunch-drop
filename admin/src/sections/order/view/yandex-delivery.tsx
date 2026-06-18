'use client';

import type { DeliveryForm, DeliveryGroup } from './yandex-delivery-data';
import type { OrderRead, KitchenMe, OrderStatus } from 'src/lib/api/orders';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';

import { fCurrency } from 'src/utils/format-number';

import axiosInstance from 'src/lib/axios';
import { updateOrderStatus } from 'src/lib/api/orders';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import {
  buildClaimPayload,
  createDeliveryForm,
  validateDeliveryForm,
  buildCheckPricePayload,
  groupOrdersForDelivery,
  isTerminalYandexStatus,
} from './yandex-delivery-data';

// ----------------------------------------------------------------------

type Props = {
  orders: OrderRead[];
  kitchen?: KitchenMe;
};

type YandexQuote = {
  price: string;
  eta: number;
  distance_meters: number;
  currency_rules?: {
    code?: string;
    sign?: string;
    text?: string;
  };
};

type YandexClaimInfo = {
  id: string;
  status: string;
  version: number;
  eta?: number;
  updated_ts?: string;
  pricing?: {
    currency?: string;
    final_price?: string | null;
    offer?: {
      price?: string;
      valid_until?: string | null;
    };
  };
  performer_info?: {
    courier_name?: string;
    car_model?: string;
    car_number?: string;
    car_color?: string;
    transport_type?: string;
  };
  error_messages?: Array<{ code?: string; message?: string }>;
  warnings?: Array<{ code?: string; message?: string }>;
};

type DeliveryState = {
  quote?: YandexQuote;
  requestId?: string;
  claimId?: string;
  info?: YandexClaimInfo;
  lastPolledAt?: string;
  error?: string;
  trackingLink?: string;
  onTheWaySynced?: boolean;
  deliveredSynced?: boolean;
};

type TrackingLinksResponse = {
  route_points: Array<{
    id: number;
    type: 'source' | 'destination' | 'return';
    visit_order: number;
    sharing_link?: string;
  }>;
};

type StatusConfig = {
  label: string;
  progress: number;
  color: 'default' | 'warning' | 'info' | 'success' | 'error';
};

const STORAGE_KEY = 'lunchdrop_yandex_delivery_claims';
const ROUTE_DEFAULTS_STORAGE_KEY = 'lunchdrop_yandex_delivery_route_defaults';

const STATUS_CONFIG: Record<string, StatusConfig> = {
  new: { label: 'Claim yaratildi', progress: 8, color: 'warning' },
  estimating: { label: 'Yandex narxni baholamoqda', progress: 12, color: 'warning' },
  estimating_failed: { label: 'Baholashda xatolik', progress: 12, color: 'error' },
  ready_for_approval: { label: 'Tasdiqlashga tayyor', progress: 20, color: 'warning' },
  accepted: { label: 'Claim tasdiqlandi', progress: 28, color: 'warning' },
  performer_lookup: { label: 'Kuryer qidirilmoqda', progress: 35, color: 'warning' },
  performer_draft: { label: 'Kuryer tanlanmoqda', progress: 40, color: 'warning' },
  performer_found: { label: 'Kuryer topildi', progress: 50, color: 'info' },
  performer_not_found: { label: 'Kuryer topilmadi', progress: 35, color: 'error' },
  pickup_arrived: { label: 'Kuryer oshxonaga keldi', progress: 60, color: 'info' },
  ready_for_pickup_confirmation: {
    label: 'Olib ketish kodi kutilmoqda',
    progress: 65,
    color: 'info',
  },
  pickuped: { label: "Kuryer buyurtmani oldi", progress: 75, color: 'info' },
  delivery_arrived: { label: 'Kuryer filialga keldi', progress: 90, color: 'info' },
  ready_for_delivery_confirmation: {
    label: 'Yetkazish kodi kutilmoqda',
    progress: 95,
    color: 'info',
  },
  delivered: { label: 'Yetkazildi', progress: 100, color: 'success' },
  delivered_finish: { label: 'Yetkazish yakunlandi', progress: 100, color: 'success' },
  returning: { label: 'Buyurtma qaytarilmoqda', progress: 80, color: 'warning' },
  return_arrived: { label: 'Kuryer qaytarish manzilida', progress: 90, color: 'warning' },
  ready_for_return_confirmation: {
    label: "Qaytarish tasdig'i kutilmoqda",
    progress: 95,
    color: 'warning',
  },
  returned: { label: 'Buyurtma qaytarildi', progress: 100, color: 'error' },
  returned_finish: { label: 'Qaytarish yakunlandi', progress: 100, color: 'error' },
  failed: { label: 'Yetkazish bajarilmadi', progress: 100, color: 'error' },
  cancelled: { label: 'Bekor qilindi', progress: 100, color: 'error' },
  cancelled_with_payment: { label: "To'lov bilan bekor qilindi", progress: 100, color: 'error' },
  cancelled_by_taxi: { label: 'Yandex tomonidan bekor qilindi', progress: 100, color: 'error' },
  cancelled_with_items_on_hands: {
    label: "Kuryerdagi buyurtma bilan bekor qilindi",
    progress: 100,
    color: 'error',
  },
};

const ON_THE_WAY_STATUSES = new Set([
  'pickuped',
  'delivery_arrived',
  'ready_for_delivery_confirmation',
]);
const DELIVERED_STATUSES = new Set(['delivered', 'delivered_finish']);

// ----------------------------------------------------------------------

function getStatusConfig(status?: string): StatusConfig {
  if (!status) return { label: "Ma'lumot kutilmoqda", progress: 5, color: 'default' };
  return STATUS_CONFIG[status] ?? { label: status, progress: 10, color: 'default' };
}

function formatMoney(value?: string, currency = 'UZS') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  return fCurrency(amount, { currency });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Yandex Delivery so'rovida xatolik";
}

async function postYandex<T>(body: Record<string, unknown>) {
  const response = await axiosInstance.post<T>('/api/yandex-delivery', body);
  return response.data;
}

// ----------------------------------------------------------------------

export function YandexDelivery({ orders, kitchen }: Props) {
  const queryClient = useQueryClient();
  const groups = useMemo(() => groupOrdersForDelivery(orders), [orders]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [forms, setForms] = useState<Record<string, DeliveryForm>>({});
  const [routeDefaults, setRouteDefaults] = useState<Record<string, DeliveryForm>>({});
  const [deliveries, setDeliveries] = useState<Record<string, DeliveryState>>({});
  const [storageReady, setStorageReady] = useState(false);
  const [routeDefaultsReady, setRouteDefaultsReady] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const deliveriesRef = useRef(deliveries);
  const syncingRef = useRef(new Set<string>());

  useEffect(() => {
    deliveriesRef.current = deliveries;
  }, [deliveries]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, DeliveryState>;
        if (parsed && typeof parsed === 'object') setDeliveries(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ROUTE_DEFAULTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, DeliveryForm>;
        if (parsed && typeof parsed === 'object') setRouteDefaults(parsed);
      }
    } catch {
      window.localStorage.removeItem(ROUTE_DEFAULTS_STORAGE_KEY);
    } finally {
      setRouteDefaultsReady(true);
    }
  }, []);

  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deliveries));
    }
  }, [deliveries, storageReady]);

  useEffect(() => {
    if (routeDefaultsReady) {
      window.localStorage.setItem(ROUTE_DEFAULTS_STORAGE_KEY, JSON.stringify(routeDefaults));
    }
  }, [routeDefaults, routeDefaultsReady]);

  useEffect(() => {
    let active = true;

    axiosInstance
      .get<{ configured: boolean }>('/api/yandex-delivery')
      .then((response) => {
        if (active) setConfigured(response.data.configured);
      })
      .catch((error: unknown) => {
        if (active) {
          setConfigured(false);
          toast.error(getErrorMessage(error));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const getForm = useCallback(
    (group: DeliveryGroup) =>
      forms[group.id] ?? {
        ...createDeliveryForm(group, kitchen),
        ...routeDefaults[group.branchId],
      },
    [forms, kitchen, routeDefaults]
  );

  const updateForm = (
    group: DeliveryGroup,
    field: keyof DeliveryForm,
    value: string
  ) => {
    const nextForm = {
      ...(forms[group.id] ?? {
        ...createDeliveryForm(group, kitchen),
        ...routeDefaults[group.branchId],
      }),
      [field]: value,
    };

    setForms((current) => ({
      ...current,
      [group.id]: nextForm,
    }));
    setRouteDefaults((current) => ({
      ...current,
      [group.branchId]: nextForm,
    }));
  };

  const syncLunchDropStatus = useCallback(
    async (groupId: string, info: YandexClaimInfo) => {
      const group = groups.find((item) => item.id === groupId);
      const delivery = deliveriesRef.current[groupId];
      if (!group || !delivery) return;

      let status: OrderStatus | null = null;
      let syncFlag: 'onTheWaySynced' | 'deliveredSynced' | null = null;

      if (DELIVERED_STATUSES.has(info.status) && !delivery.deliveredSynced) {
        status = 'delivered';
        syncFlag = 'deliveredSynced';
      } else if (ON_THE_WAY_STATUSES.has(info.status) && !delivery.onTheWaySynced) {
        status = 'on_the_way';
        syncFlag = 'onTheWaySynced';
      }

      if (!status || !syncFlag) return;

      const syncKey = `${groupId}:${status}`;
      if (syncingRef.current.has(syncKey)) return;
      syncingRef.current.add(syncKey);

      try {
        await Promise.all(group.orderIds.map((orderId) => updateOrderStatus(orderId, status!)));
        setDeliveries((current) => ({
          ...current,
          [groupId]: {
            ...current[groupId],
            [syncFlag!]: true,
          },
        }));
        await queryClient.invalidateQueries({ queryKey: ['orders'] });

        if (status === 'delivered') {
          toast.success("Yandex yetkazdi, LunchDrop buyurtmalari ham 'Yetkazildi' qilindi");
        }
      } catch (error) {
        toast.error(`LunchDrop holatini yangilab bo'lmadi: ${getErrorMessage(error)}`);
      } finally {
        syncingRef.current.delete(syncKey);
      }
    },
    [groups, queryClient]
  );

  const refreshClaim = useCallback(
    async (groupId: string, claimId: string, notify = false) => {
      try {
        const info = await postYandex<YandexClaimInfo>({ action: 'info', claimId });
        setDeliveries((current) => ({
          ...current,
          [groupId]: {
            ...current[groupId],
            claimId,
            info,
            error: undefined,
            lastPolledAt: new Date().toISOString(),
          },
        }));
        await syncLunchDropStatus(groupId, info);
        if (notify) toast.success("Yandex holati yangilandi");
      } catch (error) {
        setDeliveries((current) => ({
          ...current,
          [groupId]: {
            ...current[groupId],
            error: getErrorMessage(error),
          },
        }));
        if (notify) toast.error(getErrorMessage(error));
      }
    },
    [syncLunchDropStatus]
  );

  const hasActiveClaims = Object.values(deliveries).some(
    (delivery) => delivery.claimId && !isTerminalYandexStatus(delivery.info?.status)
  );

  useEffect(() => {
    if (!configured || !hasActiveClaims) return undefined;

    let active = true;
    const poll = async () => {
      const claims = Object.entries(deliveriesRef.current).filter(
        ([, delivery]) =>
          delivery.claimId && !isTerminalYandexStatus(delivery.info?.status)
      );

      await Promise.all(
        claims.map(([groupId, delivery]) =>
          active && delivery.claimId
            ? refreshClaim(groupId, delivery.claimId)
            : Promise.resolve()
        )
      );
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 15_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [configured, hasActiveClaims, refreshClaim]);

  const handleQuote = async (group: DeliveryGroup) => {
    const form = getForm(group);
    const error = validateDeliveryForm(form);
    if (error) {
      toast.error(error);
      return;
    }

    setBusyAction(`${group.id}:quote`);
    try {
      const quote = await postYandex<YandexQuote>({
        action: 'check-price',
        payload: buildCheckPricePayload(form),
      });
      setDeliveries((current) => ({
        ...current,
        [group.id]: {
          ...current[group.id],
          quote,
          error: undefined,
        },
      }));
      toast.success('Yandex real narx va ETA qaytardi');
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreate = async (group: DeliveryGroup) => {
    if (!kitchen) return;

    const form = getForm(group);
    const error = validateDeliveryForm(form);
    const delivery = deliveriesRef.current[group.id];
    if (error || !delivery?.quote) {
      toast.error(error ?? 'Avval narxni hisoblang');
      return;
    }

    const requestId = delivery.requestId ?? window.crypto.randomUUID();
    setBusyAction(`${group.id}:create`);
    setDeliveries((current) => ({
      ...current,
      [group.id]: {
        ...current[group.id],
        requestId,
        error: undefined,
      },
    }));

    try {
      const currency = delivery.quote.currency_rules?.code ?? 'UZS';
      const info = await postYandex<YandexClaimInfo>({
        action: 'create',
        requestId,
        payload: buildClaimPayload(group, kitchen, form, currency),
      });
      setDeliveries((current) => ({
        ...current,
        [group.id]: {
          ...current[group.id],
          requestId,
          claimId: info.id,
          info,
          error: undefined,
          lastPolledAt: new Date().toISOString(),
        },
      }));
      toast.success('Yandex claim yaratildi');
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setDeliveries((current) => ({
        ...current,
        [group.id]: {
          ...current[group.id],
          requestId,
          error: message,
        },
      }));
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleAccept = async (group: DeliveryGroup) => {
    const delivery = deliveriesRef.current[group.id];
    if (!delivery?.claimId || typeof delivery.info?.version !== 'number') return;

    setBusyAction(`${group.id}:accept`);
    try {
      const info = await postYandex<YandexClaimInfo>({
        action: 'accept',
        claimId: delivery.claimId,
        version: delivery.info.version,
      });
      setDeliveries((current) => ({
        ...current,
        [group.id]: {
          ...current[group.id],
          info,
          error: undefined,
          lastPolledAt: new Date().toISOString(),
        },
      }));
      toast.success('Kuryer qidirish boshlandi');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleTrackingLink = async (group: DeliveryGroup) => {
    const delivery = deliveriesRef.current[group.id];
    if (!delivery?.claimId) return;

    if (delivery.trackingLink) {
      window.open(delivery.trackingLink, '_blank', 'noopener,noreferrer');
      return;
    }

    const trackingWindow = window.open('', '_blank');
    setBusyAction(`${group.id}:tracking`);
    try {
      const response = await postYandex<TrackingLinksResponse>({
        action: 'tracking-links',
        claimId: delivery.claimId,
      });
      const trackingLink = response.route_points.find(
        (point) => point.type === 'destination' && point.sharing_link
      )?.sharing_link;

      if (!trackingLink) {
        trackingWindow?.close();
        toast.error("Yandex hali kuzatuv havolasini bermadi");
        return;
      }

      setDeliveries((current) => ({
        ...current,
        [group.id]: {
          ...current[group.id],
          trackingLink,
        },
      }));
      if (trackingWindow) {
        trackingWindow.opener = null;
        trackingWindow.location.href = trackingLink;
      } else {
        window.open(trackingLink, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      trackingWindow?.close();
      toast.error(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  if (groups.length === 0) return null;

  return (
    <Card sx={{ mb: { xs: 3, md: 5 }, overflow: 'hidden' }}>
      <Box
        sx={{
          p: 3,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          bgcolor: '#ffdc00',
          color: '#111',
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Iconify icon="custom:delivery-bold" width={26} />
            <Typography variant="h6">Yandex Delivery</Typography>
            <Label color="success" variant="filled">Real API</Label>
          </Stack>
          <Typography variant="body2">
            Narx hisoblash, claim yaratish, kuryer chaqirish va status kuzatish.
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ maxWidth: 370 }}>
          Faol claimlar 15 soniyada bir marta yangilanadi. Yandex yetkazganda LunchDrop holati
          avtomatik yangilanadi.
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
        {configured === null && <LinearProgress sx={{ mb: 3 }} />}

        {configured === false && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Yandex token bir marta olinadi va muddatsiz ishlaydi. Tokenning o&apos;zini
            {' '}<strong>admin/.secrets/yandex-delivery-token</strong> fayliga yozing.
            Serverni qayta ishga tushirish shart emas.
          </Alert>
        )}

        {!kitchen && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Oshxona ma&apos;lumotlari yuklanmadi. Real claim yaratish uchun oshxona nomi va
            koordinatalari kerak.
          </Alert>
        )}

        <Stack spacing={2}>
          {groups.map((group) => {
            const form = getForm(group);
            const delivery = deliveries[group.id];
            const info = delivery?.info;
            const status = getStatusConfig(info?.status);
            const currency =
              info?.pricing?.currency ?? delivery?.quote?.currency_rules?.code ?? 'UZS';
            const currentPrice =
              info?.pricing?.final_price ??
              info?.pricing?.offer?.price ??
              delivery?.quote?.price;
            const eta = info?.eta ?? delivery?.quote?.eta;
            const courier = info?.performer_info;
            const canEdit = !delivery?.claimId;

            return (
              <Box
                key={group.id}
                sx={(theme) => ({
                  p: 2.5,
                  borderRadius: 2,
                  border: `1px solid ${theme.vars.palette.divider}`,
                })}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {group.companyName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.branchName} - {group.targetDate}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Buyurtmalar</Typography>
                      <Typography variant="subtitle2">{group.orderCount} ta</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Taomlar summasi</Typography>
                      <Typography variant="subtitle2">
                        {formatMoney(String(group.totalAmount))}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>

                {canEdit && (
                  <>
                    <Divider sx={{ my: 2 }} />

                    <Box
                      sx={{
                        gap: 2,
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          md: 'repeat(2, minmax(0, 1fr))',
                        },
                      }}
                    >
                      <TextField
                        label="Oshxona manzili"
                        value={form.pickupAddress}
                        onChange={(event) => updateForm(group, 'pickupAddress', event.target.value)}
                        disabled={!configured}
                      />
                      <TextField
                        label="Oshxona telefoni"
                        value={form.pickupPhone}
                        onChange={(event) => updateForm(group, 'pickupPhone', event.target.value)}
                        placeholder="+998..."
                        disabled={!configured}
                      />
                      <TextField
                        label="Oshxona longitude"
                        value={form.pickupLng}
                        onChange={(event) => updateForm(group, 'pickupLng', event.target.value)}
                        disabled={!configured}
                      />
                      <TextField
                        label="Oshxona latitude"
                        value={form.pickupLat}
                        onChange={(event) => updateForm(group, 'pickupLat', event.target.value)}
                        disabled={!configured}
                      />
                      <TextField
                        label="Filial manzili"
                        value={form.dropoffAddress}
                        onChange={(event) => updateForm(group, 'dropoffAddress', event.target.value)}
                        disabled={!configured}
                      />
                      <TextField
                        label="Qabul qiluvchi"
                        value={form.dropoffContactName}
                        onChange={(event) =>
                          updateForm(group, 'dropoffContactName', event.target.value)
                        }
                        disabled={!configured}
                      />
                      <TextField
                        label="Filial telefoni"
                        value={form.dropoffPhone}
                        onChange={(event) => updateForm(group, 'dropoffPhone', event.target.value)}
                        placeholder="+998..."
                        disabled={!configured}
                      />
                      <TextField
                        label="Taxminiy vazn (kg)"
                        value={form.weightKg}
                        onChange={(event) => updateForm(group, 'weightKg', event.target.value)}
                        disabled={!configured}
                      />
                      <TextField
                        label="Filial longitude"
                        value={form.dropoffLng}
                        onChange={(event) => updateForm(group, 'dropoffLng', event.target.value)}
                        disabled={!configured}
                      />
                      <TextField
                        label="Filial latitude"
                        value={form.dropoffLat}
                        onChange={(event) => updateForm(group, 'dropoffLat', event.target.value)}
                        disabled={!configured}
                      />
                    </Box>
                  </>
                )}

                {delivery?.quote && (
                  <>
                    <Divider sx={{ my: 2 }} />

                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={2}
                      sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
                    >
                      <Box sx={{ flex: 1 }}>
                        {info ? (
                          <>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
                            >
                              <Label color={status.color} variant="soft">{status.label}</Label>
                              <Typography variant="caption" color="text.secondary">
                                ETA: {typeof eta === 'number' ? `${eta} daqiqa` : '-'}
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={status.progress}
                              color={status.color === 'default' ? 'inherit' : status.color}
                              sx={{ height: 7, borderRadius: 1 }}
                            />
                          </>
                        ) : (
                          <Label color="warning" variant="soft">Narx hisoblandi</Label>
                        )}
                      </Box>

                      <Stack direction="row" spacing={3}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Yetkazish narxi
                          </Typography>
                          <Typography variant="subtitle2">
                            {formatMoney(currentPrice, currency)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Masofa</Typography>
                          <Typography variant="subtitle2">
                            {(delivery.quote.distance_meters / 1000).toFixed(1)} km
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">ETA</Typography>
                          <Typography variant="subtitle2">
                            {typeof eta === 'number' ? `${eta} daqiqa` : '-'}
                          </Typography>
                        </Box>
                      </Stack>

                      {!delivery.claimId && (
                        <Stack direction="row" spacing={1}>
                          <LoadingButton
                            variant="outlined"
                            loading={busyAction === `${group.id}:quote`}
                            disabled={!configured}
                            onClick={() => handleQuote(group)}
                          >
                            Qayta hisoblash
                          </LoadingButton>
                          <LoadingButton
                            variant="contained"
                            loading={busyAction === `${group.id}:create`}
                            disabled={!configured || !kitchen}
                            startIcon={<Iconify icon="solar:box-minimalistic-bold" />}
                            onClick={() => handleCreate(group)}
                          >
                            Claim yaratish
                          </LoadingButton>
                        </Stack>
                      )}

                      {info?.status === 'ready_for_approval' && (
                        <LoadingButton
                          variant="contained"
                          loading={busyAction === `${group.id}:accept`}
                          startIcon={<Iconify icon="mdi:motorbike" />}
                          onClick={() => handleAccept(group)}
                        >
                          Kuryer chaqirish
                        </LoadingButton>
                      )}

                      {delivery.claimId && info?.status !== 'ready_for_approval' && (
                        <Button
                          variant="outlined"
                          startIcon={<Iconify icon="solar:restart-bold" />}
                          onClick={() => refreshClaim(group.id, delivery.claimId!, true)}
                        >
                          Yangilash
                        </Button>
                      )}
                    </Stack>

                    {delivery.claimId && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 1.5, wordBreak: 'break-all' }}
                      >
                        Claim ID: {delivery.claimId}
                        {delivery.lastPolledAt
                          ? ` | Oxirgi tekshiruv: ${new Date(delivery.lastPolledAt).toLocaleTimeString('uz-UZ')}`
                          : ''}
                      </Typography>
                    )}
                  </>
                )}

                {!delivery?.quote && (
                  <Stack sx={{ mt: 2, alignItems: 'flex-end' }}>
                    <LoadingButton
                      variant="contained"
                      color="warning"
                      loading={busyAction === `${group.id}:quote`}
                      disabled={!configured || !kitchen}
                      startIcon={<Iconify icon="solar:bill-list-bold" />}
                      onClick={() => handleQuote(group)}
                    >
                      Yandex narxini hisoblash
                    </LoadingButton>
                  </Stack>
                )}

                {delivery?.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {delivery.error}
                  </Alert>
                )}

                {!!info?.error_messages?.length && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {info.error_messages.map((item) => item.message ?? item.code).join(', ')}
                  </Alert>
                )}

                {!!info?.warnings?.length && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {info.warnings.map((item) => item.message ?? item.code).join(', ')}
                  </Alert>
                )}

                {courier && (
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{
                      mt: 2,
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'background.neutral',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                    }}
                  >
                    <Iconify icon="solar:user-id-bold" width={28} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">
                        {courier.courier_name ?? 'Yandex kuryer'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[courier.transport_type, courier.car_model, courier.car_number]
                          .filter(Boolean)
                          .join(' | ')}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      ETA: {typeof info?.eta === 'number' ? `${info.eta} daqiqa` : '-'}
                    </Typography>
                    <LoadingButton
                      size="small"
                      variant="outlined"
                      loading={busyAction === `${group.id}:tracking`}
                      startIcon={<Iconify icon="mingcute:location-fill" />}
                      onClick={() => handleTrackingLink(group)}
                    >
                      Kuzatish
                    </LoadingButton>
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Card>
  );
}
