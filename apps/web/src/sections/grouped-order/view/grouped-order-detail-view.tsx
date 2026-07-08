'use client';

import { usePopover } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fDateTime } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import axios from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  status: string;
  total_price: number;
  note: string | null;
  items: OrderItem[];
};

type GroupedOrderDetail = {
  id: string;
  kitchen: { id: string; name: string };
  branch: { id: string; name: string };
  status: string;
  total_orders: number;
  total_items: number;
  total_amount: number;
  delivery_time: string | null;
  created_at: string;
  orders: Order[];
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  sent: ['cooking', 'cancelled'],
  cooking: ['ready', 'cancelled'],
  ready: ['delivered'],
  delivered: [],
  cancelled: [],
};

const statusColor = (s: string) => {
  if (s === 'delivered') return 'success';
  if (s === 'cancelled') return 'error';
  if (s === 'cooking') return 'warning';
  if (s === 'ready') return 'info';
  return 'default';
};

const orderStatusColor = (s: string) => {
  if (s === 'delivered') return 'success';
  if (s === 'cancelled') return 'error';
  if (s === 'cooking') return 'warning';
  if (s === 'ready') return 'info';
  if (s === 'pending') return 'default';
  return 'default';
};

// ----------------------------------------------------------------------

function StatusUpdateButton({
  status,
  groupId,
  onRefresh,
}: {
  status: string;
  groupId: string;
  onRefresh: () => void;
}) {
  const popover = usePopover();
  const transitions = STATUS_TRANSITIONS[status] ?? [];
  if (transitions.length === 0) return null;

  const handleUpdate = async (newStatus: string) => {
    try {
      await axios.patch(`/api/v1/kitchen/orders/${groupId}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      onRefresh();
    } catch {
      toast.error('Failed to update status');
    }
    popover.onClose();
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={popover.onOpen}
        endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} />}
      >
        Status o&apos;zgartirish
      </Button>

      <CustomPopover open={popover.open} anchorEl={popover.anchorEl} onClose={popover.onClose}>
        <MenuList>
          {transitions.map((s) => (
            <MenuItem key={s} onClick={() => handleUpdate(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>
    </>
  );
}

// ----------------------------------------------------------------------

export function GroupedOrderDetailView({ id }: { id: string }) {
  const [data, setData] = useState<GroupedOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get<GroupedOrderDetail>(`/api/v1/kitchen/orders/${id}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load grouped order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!data) {
    return (
      <DashboardContent>
        <Typography color="error">Topilmadi</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Guruhli buyurtma"
        backHref={paths.dashboard.groupedOrder.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Grouped Orders', href: paths.dashboard.groupedOrder.root },
          { name: data.id.slice(0, 8) + '...' },
        ]}
        action={
          <StatusUpdateButton
            status={data.status}
            groupId={data.id}
            onRefresh={fetchDetail}
          />
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* ─── Summary card ─── */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          divider={<Divider orientation="vertical" flexItem />}
          sx={{ flexWrap: 'wrap' }}
        >
          <Stack spacing={0.5} sx={{ minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Oshxona</Typography>
            <Typography variant="subtitle2">{data.kitchen?.name ?? '—'}</Typography>
          </Stack>
          <Stack spacing={0.5} sx={{ minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Filial</Typography>
            <Typography variant="subtitle2">{data.branch?.name ?? '—'}</Typography>
          </Stack>
          <Stack spacing={0.5} sx={{ minWidth: 100 }}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Chip
              label={data.status}
              color={statusColor(data.status) as any}
              size="small"
              variant="soft"
              sx={{ width: 'fit-content' }}
            />
          </Stack>
          <Stack spacing={0.5} sx={{ minWidth: 100 }}>
            <Typography variant="caption" color="text.secondary">Buyurtmalar</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{data.total_orders}</Typography>
          </Stack>
          <Stack spacing={0.5} sx={{ minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary">Jami summa</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{fCurrency(data.total_amount)}</Typography>
          </Stack>
          <Stack spacing={0.5} sx={{ minWidth: 160 }}>
            <Typography variant="caption" color="text.secondary">Yaratildi</Typography>
            <Typography variant="subtitle2">{fDateTime(data.created_at)}</Typography>
          </Stack>
        </Stack>
      </Card>

      {/* ─── Orders table ─── */}
      <Card>
        <Scrollbar>
          <Table size="medium" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Foydalanuvchi</TableCell>
                <TableCell>Taomlar</TableCell>
                <TableCell width={120} align="right">Summa</TableCell>
                <TableCell width={110}>Status</TableCell>
                <TableCell width={200}>Izoh</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {order.user_name ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {order.user_phone ?? order.user_id.slice(0, 8)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {order.items.map((item) => (
                        <Box key={item.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="body2">{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            × {item.quantity}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {fCurrency(order.total_price)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.status}
                      color={orderStatusColor(order.status) as any}
                      size="small"
                      variant="soft"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {order.note ?? '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}

              {data.orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    Buyurtmalar yo&apos;q
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </Card>
    </DashboardContent>
  );
}
