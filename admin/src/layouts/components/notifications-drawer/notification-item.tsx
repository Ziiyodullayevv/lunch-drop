'use client';

import type { NotificationData } from './use-notifications';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { notificationIcons } from './icons';

// ----------------------------------------------------------------------

export type NotificationItemProps = {
  notification: NotificationData & { isUnRead: boolean; avatarUrl: string | null };
  onRead?:    (id: string) => void;
  onApprove?: (id: string) => Promise<void>;
  onDecline?: (id: string) => Promise<void>;
};

const renderIcon = (type: string) =>
  ({
    order:            notificationIcons.order,
    chat:             notificationIcons.chat,
    mail:             notificationIcons.mail,
    delivery:         notificationIcons.delivery,
    kitchen_pending:  notificationIcons.kitchen_pending,
    company_pending:  notificationIcons.company_pending,
    employee_pending: notificationIcons.employee_pending,
  })[type] ?? notificationIcons.order;

const ROLE_LABEL: Record<string, string> = {
  kitchen_admin: 'Oshxona admini',
  company_admin: 'Kompaniya admini',
};

// ----------------------------------------------------------------------

function PendingDetailDialog({
  open,
  notification,
  onClose,
  onApprove,
  onDecline,
}: {
  open: boolean;
  notification: NotificationItemProps['notification'];
  onClose: () => void;
  onApprove?: (id: string) => Promise<void>;
  onDecline?: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);

  const isActed = !notification.isUnRead;

  const handleApprove = async () => {
    if (!onApprove) return;
    setBusy('approve');
    await onApprove(notification.id);
    setBusy(null);
    onClose();
  };

  const handleDecline = async () => {
    if (!onDecline) return;
    setBusy('decline');
    await onDecline(notification.id);
    setBusy(null);
    onClose();
  };

  const isEmployee = notification.type === 'employee_pending';
  const roleLabel  = ROLE_LABEL[notification.role ?? ''] ?? notification.role ?? '—';
  const typeColor  = isEmployee ? 'info'
    : notification.type === 'kitchen_pending' ? 'success'
    : 'warning';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'background.neutral',
            }}
          >
            <SvgIcon sx={{ width: 22, height: 22 }}>{renderIcon(notification.type)}</SvgIcon>
          </Box>
          <Box>
            <Typography variant="subtitle1">
              {isEmployee ? "Xodim arizasi" : "Admin arizasi"}
            </Typography>
            <Chip
              label={isEmployee ? 'Yangi xodim' : roleLabel}
              color={typeColor}
              size="small"
              variant="soft"
              sx={{ mt: 0.3 }}
            />
          </Box>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2.5 }}>
        <Stack spacing={2}>
          <DetailRow
            icon="solar:user-bold"
            label={isEmployee ? "Ismi" : "To'liq ismi"}
            value={notification.full_name ?? '—'}
          />
          <DetailRow
            icon="solar:phone-bold"
            label="Telefon"
            value={notification.phone ?? notification.body ?? '—'}
          />
          {isEmployee && notification.branch_id && (
            <DetailRow
              icon="solar:home-2-bold"
              label="Filial ID"
              value={notification.branch_id.slice(0, 12) + '…'}
            />
          )}
          {!isEmployee && notification.entity_name && (
            <DetailRow
              icon={notification.type === 'kitchen_pending'
                ? 'solar:chef-hat-bold'
                : 'solar:buildings-2-bold'}
              label={notification.type === 'kitchen_pending' ? 'Oshxona nomi' : 'Kompaniya nomi'}
              value={notification.entity_name}
            />
          )}
          <DetailRow
            icon="solar:calendar-bold"
            label="Ariza vaqti"
            value={fDateTime(notification.created_at)}
          />
          <DetailRow
            icon="solar:shield-check-bold"
            label="Holat"
            value={isActed ? 'Ishlov berilgan' : 'Kutilmoqda'}
            valueColor={isActed ? 'success.main' : 'warning.main'}
          />
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" size="small">
          Yopish
        </Button>

        {!isActed && (
          <>
            <LoadingButton
              size="small"
              variant="outlined"
              color="error"
              loading={busy === 'decline'}
              disabled={busy !== null}
              onClick={handleDecline}
            >
              Rad etish
            </LoadingButton>
            <LoadingButton
              size="small"
              variant="contained"
              color="success"
              loading={busy === 'approve'}
              disabled={busy !== null}
              onClick={handleApprove}
            >
              Tasdiqlash
            </LoadingButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function DetailRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 36, height: 36, flexShrink: 0, borderRadius: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'background.neutral',
        }}
      >
        { }
        <Iconify icon={icon as any} width={18} sx={{ color: 'text.secondary' }} />
      </Box>
      <Box>
        <Typography variant="caption" color="text.disabled">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, color: valueColor }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function NotificationItem({ notification, onRead, onApprove, onDecline }: NotificationItemProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);

  const isPending =
    notification.type === 'kitchen_pending' ||
    notification.type === 'company_pending' ||
    notification.type === 'employee_pending';

  const handleItemClick = () => {
    if (isPending) {
      setDetailOpen(true);
      return;
    }
    onRead?.(notification.id);
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onApprove) return;
    setBusy('approve');
    await onApprove(notification.id);
    setBusy(null);
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDecline) return;
    setBusy('decline');
    await onDecline(notification.id);
    setBusy(null);
  };

  return (
    <>
      <ListItemButton
        disableRipple
        onClick={handleItemClick}
        sx={(theme) => ({
          p: 2.5,
          alignItems: 'flex-start',
          borderBottom: `dashed 1px ${theme.vars.palette.divider}`,
          ...(notification.isUnRead && { bgcolor: 'action.hover' }),
          ...(isPending && { cursor: 'pointer' }),
        })}
      >
        {/* Unread dot */}
        {notification.isUnRead && (
          <Box
            sx={{
              top: 26, right: 20, width: 8, height: 8,
              position: 'absolute', borderRadius: '50%', bgcolor: 'info.main',
            }}
          />
        )}

        {/* Avatar */}
        <ListItemAvatar>
          {notification.avatarUrl ? (
            <Avatar src={notification.avatarUrl} sx={{ bgcolor: 'background.neutral' }} />
          ) : (
            <Box
              sx={{
                width: 40, height: 40, display: 'flex', borderRadius: '50%',
                alignItems: 'center', justifyContent: 'center', bgcolor: 'background.neutral',
              }}
            >
              <SvgIcon sx={{ width: 24, height: 24 }}>{renderIcon(notification.type)}</SvgIcon>
            </Box>
          )}
        </ListItemAvatar>

        {/* Content */}
        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
          <ListItemText
            primary={notification.title}
            slotProps={{
              primary: { sx: { mb: 0.5, typography: 'subtitle2' } },
              secondary: { sx: { typography: 'caption', color: 'text.disabled' } },
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Typography variant="caption" color="text.disabled">
              {fToNow(notification.created_at)}
            </Typography>
            {isPending && (
              <Typography variant="caption" color="primary.main">
                · Batafsil
              </Typography>
            )}
          </Box>

          {/* Approve/Decline — faqat unread va pending bo'lsa */}
          {isPending && notification.isUnRead && (
            <Box sx={{ gap: 1, mt: 1, display: 'flex' }} onClick={(e) => e.stopPropagation()}>
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={busy !== null}
                onClick={handleApprove}
              >
                {busy === 'approve' ? '...' : 'Tasdiqlash'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={busy !== null}
                onClick={handleDecline}
              >
                {busy === 'decline' ? '...' : 'Rad etish'}
              </Button>
            </Box>
          )}
        </Box>
      </ListItemButton>

      {/* Detail dialog */}
      {isPending && (
        <PendingDetailDialog
          open={detailOpen}
          notification={notification}
          onClose={() => setDetailOpen(false)}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      )}
    </>
  );
}
