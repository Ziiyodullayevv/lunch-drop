'use client';

import type { KitchenConnectionRead } from 'src/lib/api/companies';
import type { KitchenPartnerReport } from 'src/lib/api/kitchen-connections';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fetchKitchenPartners,
  rejectKitchenConnection,
  approveKitchenConnection,
  fetchKitchenConnectionRequests,
} from 'src/lib/api/kitchen-connections';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { useTranslate } from 'src/locales';

const money = (value: string) => `${Number(value).toLocaleString('uz-UZ')} so‘m`;

export function KitchenPartnersView() {
  const { t } = useTranslate('common');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [requests, setRequests] = useState<KitchenConnectionRead[]>([]);
  const [partners, setPartners] = useState<KitchenPartnerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [requestData, partnerData] = await Promise.all([
        fetchKitchenConnectionRequests(),
        fetchKitchenPartners(month),
      ]);
      setRequests(requestData);
      setPartners(partnerData);
    } catch {
      toast.error(t('partners.loadError'));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, approve: boolean) => {
    setActionId(id);
    try {
      if (approve) await approveKitchenConnection(id);
      else await rejectKitchenConnection(id);
      toast.success(approve ? t('partners.approved') : t('partners.rejected'));
      await load();
    } catch {
      toast.error(t('partners.updateError'));
    } finally {
      setActionId('');
    }
  };

  const pending = requests.filter((request) => request.status === 'pending');
  const gross = partners.reduce((sum, row) => sum + Number(row.gross_amount), 0);
  const receivable = partners.reduce((sum, row) => sum + Number(row.kitchen_receivable), 0);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('partners.title')}
        links={[{ name: t('navigation.dashboard'), href: '/dashboard' }, { name: t('partners.title') }]}
        sx={{ mb: 3 }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{t('partners.pendingTitle')}</Typography>
          <Stack spacing={2} divider={<Divider flexItem />}>
            {pending.map((request) => (
              <Stack
                key={request.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { sm: 'center' } }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">{request.company_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{t('partners.branch')}: {request.branch_name}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <LoadingButton loading={actionId === request.id} variant="contained" onClick={() => review(request.id, true)}>
                    {t('common.approve')}
                  </LoadingButton>
                  <Button color="error" variant="outlined" disabled={actionId === request.id} onClick={() => review(request.id, false)}>
                    {t('common.reject')}
                  </Button>
                </Stack>
              </Stack>
            ))}
            {!pending.length && <Typography color="text.secondary">{t('partners.noPending')}</Typography>}
          </Stack>
        </Card>

        <Card sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 3, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="h6">{t('partners.connectedTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('partners.summary', { gross: gross.toLocaleString('uz-UZ'), receivable: receivable.toLocaleString('uz-UZ') })}
              </Typography>
            </Box>
            <DatePicker
              label={t('partnersUi.month')}
              value={dayjs(`${month}-01`)}
              onChange={(value) => value && setMonth(value.format('YYYY-MM'))}
              slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
              views={['year', 'month']}
              format="MM/YYYY"
            />
          </Stack>
          <Stack spacing={2} divider={<Divider flexItem />}>
            {partners.map((row) => (
              <Stack
                key={`${row.company_id}:${row.branch_id}`}
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ alignItems: { md: 'center' } }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">{row.company_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.branch_name} · {t('partners.billingDay')}: {row.billing_day}</Typography>
                </Box>
                <Chip label={t('partners.orders', { count: row.orders_count })} />
                <Box sx={{ minWidth: 190 }}>
                  <Typography variant="body2">{t('partners.companyPayment')}: {money(row.gross_amount)}</Typography>
                  <Typography variant="body2" color="success.main">{t('partners.kitchenReceives')}: {money(row.kitchen_receivable)}</Typography>
                </Box>
              </Stack>
            ))}
            {!partners.length && !loading && <Typography color="text.secondary">{t('partners.noPartners')}</Typography>}
          </Stack>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
