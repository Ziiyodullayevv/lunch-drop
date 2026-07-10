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

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fetchKitchenPartners,
  rejectKitchenConnection,
  approveKitchenConnection,
  fetchKitchenConnectionRequests,
} from 'src/lib/api/kitchen-connections';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const money = (value: string) => `${Number(value).toLocaleString('uz-UZ')} so‘m`;

export function KitchenPartnersView() {
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
      toast.error("Ma'lumotlarni yuklab bo'lmadi");
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
      toast.success(approve ? 'Ulanish tasdiqlandi' : 'So‘rov rad etildi');
      await load();
    } catch {
      toast.error("So'rovni yangilab bo'lmadi");
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
        heading="Hamkorlar va so‘rovlar"
        links={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Hamkorlar' }]}
        sx={{ mb: 3 }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Kutilayotgan ulanish so‘rovlari</Typography>
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
                  <Typography variant="body2" color="text.secondary">Filial: {request.branch_name}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <LoadingButton loading={actionId === request.id} variant="contained" onClick={() => review(request.id, true)}>
                    Tasdiqlash
                  </LoadingButton>
                  <Button color="error" variant="outlined" disabled={actionId === request.id} onClick={() => review(request.id, false)}>
                    Rad etish
                  </Button>
                </Stack>
              </Stack>
            ))}
            {!pending.length && <Typography color="text.secondary">Kutilayotgan so‘rovlar yo‘q</Typography>}
          </Stack>
        </Card>

        <Card sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 3, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="h6">Ulangan kompaniya va filiallar</Typography>
              <Typography variant="body2" color="text.secondary">
                Jami to‘lov: {gross.toLocaleString('uz-UZ')} so‘m · Oshxona oladi: {receivable.toLocaleString('uz-UZ')} so‘m
              </Typography>
            </Box>
            <TextField type="month" size="small" value={month} onChange={(event) => setMonth(event.target.value)} />
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
                  <Typography variant="body2" color="text.secondary">{row.branch_name} · To‘lov kuni: {row.billing_day}</Typography>
                </Box>
                <Chip label={`${row.orders_count} ta buyurtma`} />
                <Box sx={{ minWidth: 190 }}>
                  <Typography variant="body2">Kompaniya to‘lovi: {money(row.gross_amount)}</Typography>
                  <Typography variant="body2" color="success.main">Oshxona oladi: {money(row.kitchen_receivable)}</Typography>
                </Box>
              </Stack>
            ))}
            {!partners.length && !loading && <Typography color="text.secondary">Tasdiqlangan hamkorlar yo‘q</Typography>}
          </Stack>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
