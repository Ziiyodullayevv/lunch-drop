'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { fDate, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import {
  useOrderDetail,
  useCancelOrder,
  useKitchenOrder,
  useSuperAdminOrder,
  useConfirmDelivery,
  useUpdateOrderStatus,
} from '../hooks/use-orders';

// ----------------------------------------------------------------------

const fSom = (v: string | number) => fCurrency(Number(v));

type StatusConfig = { label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' };

const STATUS_MAP: Record<string, StatusConfig> = {
  created:    { label: 'Yangi',          color: 'warning' },
  preparing:  { label: 'Tayyorlanmoqda', color: 'warning' },
  on_the_way: { label: "Yo'lda",         color: 'info'    },
  delivered:  { label: 'Yetkazildi',     color: 'success' },
  cancelled:  { label: 'Bekor qilindi',  color: 'error'   },
};

const STATUS_ORDER = ['created', 'preparing', 'on_the_way', 'delivered'];

function isStatusPassed(currentStatus: string, checkStatus: string) {
  const ci = STATUS_ORDER.indexOf(currentStatus);
  const si = STATUS_ORDER.indexOf(checkStatus);
  return ci > si && si !== -1;
}

// ----------------------------------------------------------------------

type InfoRowProps = { icon: string; label: string; value: string };

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Iconify icon={icon as any} width={20} sx={{ color: 'text.secondary', flexShrink: 0 }} />
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = { id: string };

export function OrderDetailsView({ id }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const isSuperAdmin = user?.role === 'super_admin';
  const isKitchenAdmin = user?.role === 'kitchen_admin';
  const superAdminOrder = useSuperAdminOrder(id, isSuperAdmin);
  const kitchenOrder = useKitchenOrder(id, isKitchenAdmin);
  const regularOrder = useOrderDetail(id, !isSuperAdmin && !isKitchenAdmin);
  const order = isSuperAdmin
    ? superAdminOrder.data
    : isKitchenAdmin
      ? kitchenOrder.data
      : regularOrder.data;
  const isLoading = isSuperAdmin
    ? superAdminOrder.isLoading
    : isKitchenAdmin
      ? kitchenOrder.isLoading
      : regularOrder.isLoading;
  const isError = isSuperAdmin
    ? superAdminOrder.isError
    : isKitchenAdmin
      ? kitchenOrder.isError
      : regularOrder.isError;
  const confirmMutation = useConfirmDelivery();
  const cancelMutation  = useCancelOrder();
  const statusMutation = useUpdateOrderStatus();

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync(id);
      toast.success('Buyurtma yetkazildi deb belgilandi');
    } catch { toast.error('Xatolik yuz berdi'); }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Buyurtma bekor qilindi');
    } catch { toast.error('Xatolik yuz berdi'); }
  };

  const handleKitchenStatus = async (
    status: 'preparing' | 'on_the_way' | 'delivered' | 'cancelled'
  ) => {
    try {
      await statusMutation.mutateAsync({ id, status });
      toast.success(STATUS_MAP[status].label);
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  };

  if (isLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (isError || !order) {
    return (
      <DashboardContent>
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <Typography color="error">Buyurtma topilmadi</Typography>
        </Box>
      </DashboardContent>
    );
  }

  const statusCfg = STATUS_MAP[order.status] ?? { label: order.status, color: 'default' as const };
  const canConfirm = !isSuperAdmin && !isKitchenAdmin && order.status === 'on_the_way';
  const canCancel =
    !isSuperAdmin &&
    !isKitchenAdmin &&
    (order.status === 'created' || order.status === 'preparing');
  const kitchenNextStatus =
    order.status === 'created'
      ? { status: 'preparing' as const, label: 'Tayyorlashni boshlash' }
      : order.status === 'preparing'
        ? { status: 'on_the_way' as const, label: "Yo'lga chiqarish" }
        : order.status === 'on_the_way'
          ? { status: 'delivered' as const, label: 'Yetkazildi' }
          : null;

  return (
    <DashboardContent>
      {/* Toolbar */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          onClick={() => router.push(paths.dashboard.order.root)}
          color="inherit"
        >
          Orqaga
        </Button>

        <Label variant="soft" color={statusCfg.color} sx={{ px: 2, py: 0.75, fontSize: 13 }}>
          {statusCfg.label}
        </Label>

        <Box sx={{ flexGrow: 1 }} />

        {isKitchenAdmin && kitchenNextStatus && (
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<Iconify icon="solar:check-circle-bold" />}
            loading={statusMutation.isPending}
            onClick={() => handleKitchenStatus(kitchenNextStatus.status)}
          >
            {kitchenNextStatus.label}
          </LoadingButton>
        )}
        {isKitchenAdmin && !['delivered', 'cancelled'].includes(order.status) && (
          <LoadingButton
            variant="outlined"
            color="error"
            startIcon={<Iconify icon="solar:close-circle-bold" />}
            loading={statusMutation.isPending}
            onClick={() => handleKitchenStatus('cancelled')}
          >
            Bekor qilish
          </LoadingButton>
        )}
        {canConfirm && (
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<Iconify icon="solar:check-bold" />}
            loading={confirmMutation.isPending}
            onClick={handleConfirm}
          >
            Yetkazildi
          </LoadingButton>
        )}
        {canCancel && (
          <LoadingButton
            variant="outlined"
            color="error"
            startIcon={<Iconify icon="solar:close-circle-bold" />}
            loading={cancelMutation.isPending}
            onClick={handleCancel}
          >
            Bekor qilish
          </LoadingButton>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Left — main info */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Buyurtma ma&apos;lumotlari</Typography>

              <Stack spacing={2}>
                <InfoRow icon="solar:tea-cup-bold" label="Taom" value={order.meal_name ?? '—'} />
                <InfoRow icon="solar:calendar-date-bold" label="Yetkazish sanasi" value={fDate(order.target_date)} />
                <InfoRow icon="solar:clock-circle-bold" label="Yaratilgan vaqt" value={fDateTime(order.created_at)} />
                <InfoRow icon="custom:fast-food-fill" label="Oshxona" value={order.kitchen_name ?? '—'} />
                <InfoRow icon="solar:buildings-bold" label="Filial" value={order.branch_name ?? '—'} />
              </Stack>
            </Box>

            <Divider />

            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>To&apos;lov</Typography>

              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Taom narxi</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{fSom(order.historical_price)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Tizim to&apos;lovi</Typography>
                  <Typography variant="body2" color="text.secondary">{fSom(order.system_fee)}</Typography>
                </Box>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">Jami</Typography>
                  <Typography variant="subtitle1" color="primary.main">
                    {fSom(Number(order.historical_price) + Number(order.system_fee))}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Grid>

        {/* Right — status timeline */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Holat</Typography>

            <Stack spacing={1.5}>
              {Object.entries(STATUS_MAP).map(([key, cfg]) => {
                const isActiveStatus = order.status === key;
                const isPassed = isStatusPassed(order.status, key);
                return (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      opacity: isPassed || isActiveStatus ? 1 : 0.35,
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        flexShrink: 0,
                        bgcolor: isActiveStatus
                          ? `${cfg.color}.main`
                          : isPassed
                          ? 'success.main'
                          : 'divider',
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: isActiveStatus ? 700 : 400 }}>
                      {cfg.label}
                    </Typography>
                    {isActiveStatus && (
                      <Label variant="soft" color={cfg.color} sx={{ ml: 'auto', fontSize: 11 }}>
                        Hozir
                      </Label>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
