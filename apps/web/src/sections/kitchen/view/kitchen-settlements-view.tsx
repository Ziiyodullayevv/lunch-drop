'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';
import type { KitchenSettlement, SettlementPayment } from 'src/lib/api/kitchen-connections';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useMemo, Fragment, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  createSettlementPayment,
  deleteSettlementPayment,
  fetchKitchenSettlements,
  updateSettlementPayment,
  uploadSettlementReceipt,
} from 'src/lib/api/kitchen-connections';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const money = (value: number | string) => `${Number(value).toLocaleString('uz-UZ')} so‘m`;
const statusLabel = { pending: 'Kutilmoqda', partial: 'Qisman to‘langan', paid: 'To‘langan', overdue: 'Muddati o‘tgan' };
const statusColor = { pending: 'warning', partial: 'info', paid: 'success', overdue: 'error' } as const;

type SummaryCardProps = { title: string; value: string; icon: IconifyName; color: 'primary' | 'success' | 'warning' | 'error' };
type PaymentDraft = { amount: string; paid_at: string; payment_method: string; transaction_reference: string; note: string; receipt_url: string };

const emptyPayment = (): PaymentDraft => ({ amount: '', paid_at: dayjs().format('YYYY-MM-DD'), payment_method: 'bank_transfer', transaction_reference: '', note: '', receipt_url: '' });

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
  return <Card sx={{ p: 3, minHeight: 148, display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={(theme) => ({ width: 48, height: 48, display: 'grid', borderRadius: 1.5, placeItems: 'center', color: `${color}.main`, backgroundColor: theme.vars.palette[color].lighter })}>
      <Iconify icon={icon} width={26} />
    </Box>
    <Box sx={{ minWidth: 0 }}><Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.35 }}>{title}</Typography><Typography variant="h5" noWrap>{value}</Typography></Box>
  </Card>;
}

export function KitchenSettlementsView() {
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [rows, setRows] = useState<KitchenSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paymentActionsAvailable, setPaymentActionsAvailable] = useState(true);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialogCompany, setDialogCompany] = useState<KitchenSettlement | null>(null);
  const [editingPayment, setEditingPayment] = useState<SettlementPayment | null>(null);
  const [draft, setDraft] = useState<PaymentDraft>(emptyPayment());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const report = await fetchKitchenSettlements(month);
      setRows(report.rows);
      setPaymentActionsAvailable(report.paymentActionsAvailable);
    } catch { setError(true); } finally { setLoading(false); }
  }, [month]);
  useEffect(() => { void load(); }, [load]);

  const filteredRows = useMemo(() => rows.filter((row) =>
    (companyFilter === 'all' || row.company_id === companyFilter) && (statusFilter === 'all' || row.status === statusFilter)
  ), [rows, companyFilter, statusFilter]);
  const totals = useMemo(() => filteredRows.reduce((result, row) => ({
    receivable: result.receivable + Number(row.kitchen_receivable), paid: result.paid + Number(row.paid_amount), balance: result.balance + Number(row.balance_amount), overdue: result.overdue + (row.status === 'overdue' ? 1 : 0),
  }), { receivable: 0, paid: 0, balance: 0, overdue: 0 }), [filteredRows]);

  const openCreate = (company: KitchenSettlement) => { setDialogCompany(company); setEditingPayment(null); setDraft(emptyPayment()); setReceipt(null); };
  const openEdit = (company: KitchenSettlement, payment: SettlementPayment) => {
    setDialogCompany(company); setEditingPayment(payment); setReceipt(null);
    setDraft({ amount: String(payment.amount), paid_at: payment.paid_at, payment_method: payment.payment_method ?? 'bank_transfer', transaction_reference: payment.transaction_reference ?? '', note: payment.note ?? '', receipt_url: payment.receipt_url ?? '' });
  };
  const closeDialog = () => { if (!saving) { setDialogCompany(null); setEditingPayment(null); } };
  const changeDraft = (key: keyof PaymentDraft, value: string) => setDraft((previous) => ({ ...previous, [key]: value }));

  const savePayment = async () => {
    if (!dialogCompany || !Number(draft.amount) || Number(draft.amount) <= 0) { toast.error('To‘lov summasini kiriting'); return; }
    setSaving(true);
    try {
      const payload = { amount: Number(draft.amount), paid_at: draft.paid_at, payment_method: draft.payment_method || null, transaction_reference: draft.transaction_reference || null, note: draft.note || null, receipt_url: draft.receipt_url || null };
      const payment = editingPayment
        ? await updateSettlementPayment(editingPayment.id, payload)
        : await createSettlementPayment({ ...payload, company_id: dialogCompany.company_id, period_month: `${month}-01` });
      if (receipt) await uploadSettlementReceipt(payment.id, receipt);
      toast.success(editingPayment ? 'To‘lov yangilandi' : 'To‘lov qayd etildi');
      closeDialog(); await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'To‘lovni saqlab bo‘lmadi'); } finally { setSaving(false); }
  };
  const removePayment = async (payment: SettlementPayment) => {
    if (!window.confirm('Ushbu to‘lov yozuvi o‘chirilsinmi?')) return;
    try { await deleteSettlementPayment(payment.id); toast.success('To‘lov o‘chirildi'); await load(); } catch (err) { toast.error(err instanceof Error ? err.message : 'O‘chirishda xato'); }
  };
  const exportCsv = () => {
    const header = ['Kompaniya', 'Hisob kuni', 'Yetkazilgan buyurtmalar', 'Sof tushum', 'Qabul qilingan', 'Qoldiq', 'Holat'];
    const values = filteredRows.map((row) => [row.company_name, row.billing_day, row.orders_count, row.kitchen_receivable, row.paid_amount, row.balance_amount, statusLabel[row.status]]);
    const csv = [header, ...values].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })); link.download = `hisob-kitoblar-${month}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  return <DashboardContent>
    <CustomBreadcrumbs heading="Hisob-kitoblar" links={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Hisob-kitoblar' }]} sx={{ mb: 3 }} />
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <Box><Typography variant="h6">To‘lov nazorati</Typography><Typography variant="body2" color="text.secondary">Faqat yetkazilgan buyurtmalar bo‘yicha oshxonaga kutilayotgan tushum.</Typography></Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}><DatePicker label="Oy" value={dayjs(`${month}-01`)} onChange={(value) => value && setMonth(value.format('YYYY-MM'))} slotProps={{ textField: { size: 'small', sx: { width: 150 } } }} views={['year', 'month']} format="MM/YYYY" />
          <Button variant="outlined" startIcon={<Iconify icon="solar:download-bold" />} onClick={exportCsv}>CSV</Button>
          <Button variant="outlined" startIcon={<Iconify icon="solar:printer-minimalistic-bold" />} onClick={() => window.print()}>PDF</Button></Stack>
      </Stack></Card>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><SummaryCard title="Kutilayotgan sof tushum" value={money(totals.receivable)} icon="solar:wad-of-money-bold" color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><SummaryCard title="Qabul qilingan" value={money(totals.paid)} icon="solar:check-circle-bold" color="success" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><SummaryCard title="Qoldiq qarz" value={money(totals.balance)} icon="solar:bill-list-bold" color="warning" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><SummaryCard title="Kechikkan kompaniyalar" value={String(totals.overdue)} icon="solar:danger-bold" color="error" /></Grid>
      </Grid>
      <Card>
        {!loading && !error && !paymentActionsAvailable && <Alert severity="info" sx={{ mx: 3, mt: 3 }}>To‘lov reyestri backend yangilanishidan keyin faollashadi. Hozircha yetkazilgan buyurtmalar bo‘yicha hisobotni ko‘rishingiz mumkin.</Alert>}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 3, pb: 2, justifyContent: 'space-between' }}><Typography variant="h6">Kompaniyalar bo‘yicha hisob-kitob</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField select size="small" label="Kompaniya" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} sx={{ minWidth: 180 }}><MenuItem value="all">Barchasi</MenuItem>{rows.map((row) => <MenuItem key={row.company_id} value={row.company_id}>{row.company_name}</MenuItem>)}</TextField>
          <TextField select size="small" label="Holat" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 160 }}><MenuItem value="all">Barchasi</MenuItem>{Object.entries(statusLabel).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Stack>
        </Stack>
        {!loading && (error || !filteredRows.length) ? <EmptyContent filled title={error ? 'Hisob-kitoblarni yuklab bo‘lmadi' : 'Bu oy uchun ma’lumot yo‘q'} description={error ? 'Sahifani yangilab qayta urinib ko‘ring.' : 'Tanlangan filtr bo‘yicha kompaniya topilmadi.'} sx={{ py: 10, mx: 3, mb: 3 }} /> :
          <TableContainer sx={{ minWidth: 1000 }}><Table><TableHead><TableRow><TableCell>Kompaniya</TableCell><TableCell>Hisob kuni</TableCell><TableCell align="right">Buyurtmalar</TableCell><TableCell align="right">Sof tushum</TableCell><TableCell align="right">Qabul qilingan</TableCell><TableCell align="right">Qoldiq</TableCell><TableCell>Holat</TableCell><TableCell align="right">Amallar</TableCell></TableRow></TableHead>
          <TableBody>{loading ? <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}>Yuklanmoqda…</TableCell></TableRow> : filteredRows.map((row) => <Fragment key={row.company_id}>
            <TableRow hover><TableCell><Typography variant="subtitle2">{row.company_name}</Typography><Typography variant="caption" color="text.secondary">{row.branches.length} ta filial</Typography></TableCell><TableCell>{row.billing_day}-kun</TableCell><TableCell align="right">{row.orders_count}</TableCell><TableCell align="right">{money(row.kitchen_receivable)}</TableCell><TableCell align="right" sx={{ color: 'success.main', fontWeight: 700 }}>{money(row.paid_amount)}</TableCell><TableCell align="right" sx={{ color: Number(row.balance_amount) === 0 ? 'success.main' : 'warning.main', fontWeight: 700 }}>{money(row.balance_amount)}</TableCell><TableCell><Chip size="small" color={statusColor[row.status]} label={statusLabel[row.status]} /></TableCell><TableCell align="right"><Button size="small" onClick={() => setExpanded(expanded === row.company_id ? null : row.company_id)}>{expanded === row.company_id ? 'Yopish' : 'Batafsil'}</Button>{paymentActionsAvailable && <Button size="small" variant="contained" onClick={() => openCreate(row)} sx={{ ml: 1 }}>To‘lov qo‘shish</Button>}</TableCell></TableRow>
            {expanded === row.company_id && <TableRow key={`${row.company_id}-details`}><TableCell colSpan={8} sx={{ py: 0, bgcolor: 'background.neutral' }}><Box sx={{ p: 3 }}><Typography variant="subtitle2" sx={{ mb: 1 }}>Filiallar kesimida</Typography><Table size="small"><TableHead><TableRow><TableCell>Filial</TableCell><TableCell align="right">Buyurtmalar</TableCell><TableCell align="right">Yalpi tushum</TableCell><TableCell align="right">Tizim ulushi</TableCell><TableCell align="right">Sof tushum</TableCell></TableRow></TableHead><TableBody>{row.branches.map((branch) => <TableRow key={branch.branch_id}><TableCell>{branch.branch_name}</TableCell><TableCell align="right">{branch.orders_count}</TableCell><TableCell align="right">{money(branch.gross_amount)}</TableCell><TableCell align="right">{money(branch.system_fee)}</TableCell><TableCell align="right">{money(branch.kitchen_receivable)}</TableCell></TableRow>)}</TableBody></Table>
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>To‘lovlar tarixi</Typography>{row.payments.length ? <Table size="small"><TableHead><TableRow><TableCell>Sana</TableCell><TableCell>Usul / tranzaksiya</TableCell><TableCell>Izoh</TableCell><TableCell align="right">Summa</TableCell><TableCell align="right">Amallar</TableCell></TableRow></TableHead><TableBody>{row.payments.map((payment) => <TableRow key={payment.id}><TableCell>{dayjs(payment.paid_at).format('DD.MM.YYYY')}</TableCell><TableCell>{payment.payment_method || '—'}{payment.transaction_reference && <><br /><Typography variant="caption">{payment.transaction_reference}</Typography></>}</TableCell><TableCell>{payment.note || '—'}{payment.receipt_url && <><br /><Typography component="a" href={payment.receipt_url} target="_blank" rel="noreferrer" variant="caption" color="primary">Chekni ochish</Typography></>}</TableCell><TableCell align="right">{money(payment.amount)}</TableCell><TableCell align="right"><IconButton size="small" onClick={() => openEdit(row, payment)}><Iconify icon="solar:pen-bold" /></IconButton><IconButton size="small" color="error" onClick={() => void removePayment(payment)}><Iconify icon="solar:trash-bin-trash-bold" /></IconButton></TableCell></TableRow>)}</TableBody></Table> : <Typography variant="body2" color="text.secondary">Hali to‘lov qayd etilmagan.</Typography>}</Box></TableCell></TableRow>}
          </Fragment>)}</TableBody></Table></TableContainer>}
      </Card>
    </Stack>
    <Dialog open={Boolean(dialogCompany)} onClose={closeDialog} fullWidth maxWidth="sm"><DialogTitle>{editingPayment ? 'To‘lovni tahrirlash' : 'To‘lov qayd etish'}{dialogCompany && <Typography variant="body2" color="text.secondary">{dialogCompany.company_name} · {month}</Typography>}</DialogTitle><DialogContent dividers><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Summa" type="number" value={draft.amount} onChange={(event) => changeDraft('amount', event.target.value)} slotProps={{ htmlInput: { min: 1 } }} required fullWidth /><TextField label="To‘lov sanasi" type="date" value={draft.paid_at} onChange={(event) => changeDraft('paid_at', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth /><TextField select label="To‘lov usuli" value={draft.payment_method} onChange={(event) => changeDraft('payment_method', event.target.value)} fullWidth><MenuItem value="bank_transfer">Bank o‘tkazmasi</MenuItem><MenuItem value="cash">Naqd pul</MenuItem><MenuItem value="card">Karta</MenuItem><MenuItem value="other">Boshqa</MenuItem></TextField><TextField label="Tranzaksiya raqami" value={draft.transaction_reference} onChange={(event) => changeDraft('transaction_reference', event.target.value)} fullWidth /><TextField label="Izoh" value={draft.note} onChange={(event) => changeDraft('note', event.target.value)} multiline minRows={2} fullWidth /><Button component="label" variant="outlined" startIcon={<Iconify icon="eva:cloud-upload-fill" />}>{receipt ? receipt.name : 'Chek yoki skrinshot yuklash'}<input hidden type="file" accept="image/*" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} /></Button>{draft.receipt_url && !receipt && <Typography component="a" href={draft.receipt_url} target="_blank" rel="noreferrer" variant="body2">Mavjud chekni ochish</Typography>}</Stack></DialogContent><DialogActions><Button onClick={closeDialog}>Bekor qilish</Button><Button variant="contained" onClick={() => void savePayment()} disabled={saving}>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</Button></DialogActions></Dialog>
  </DashboardContent>;
}
