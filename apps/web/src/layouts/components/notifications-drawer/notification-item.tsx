'use client';

import type { NotificationData } from './use-notifications';

import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ListItemButton from '@mui/material/ListItemButton';

import { fDateTime } from 'src/utils/format-time';

import { useTranslate } from 'src/locales/use-locales';

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

export function formatNotificationTime(createdAt: string, now = dayjs()) {
  const created = dayjs(createdAt);
  if (!created.isValid()) return 'Vaqt noma’lum';

  const minutes = Math.max(0, now.diff(created, 'minute'));
  if (minutes < 1) return 'Hozirgina';
  if (minutes < 60) return `${minutes} daqiqa`;

  const hours = now.diff(created, 'hour');
  if (hours < 24) return `${hours} soat`;

  const days = now.diff(created, 'day');
  if (days < 7) return `${days} kun`;

  return created.format('DD MMM YYYY, HH:mm');
}

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
  const { t } = useTranslate('common');
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);

  const isActed = notification.action_status !== 'pending';

  const handleApprove = async () => {
    if (!onApprove) return;
    setBusy('approve');
    await onApprove(notification.id);
    setBusy(null);
  };

  const handleDecline = async () => {
    if (!onDecline) return;
    setBusy('decline');
    await onDecline(notification.id);
    setBusy(null);
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
              {isEmployee ? t('notifications.employeeRequest') : t('notifications.adminRequest')}
            </Typography>
            <Chip
              label={isEmployee ? t('notifications.newEmployee') : roleLabel}
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
            label={isEmployee ? t('notifications.name') : t('notifications.fullName')}
            value={notification.full_name ?? '—'}
          />
          <DetailRow
            icon="solar:phone-bold"
            label={t('notifications.phone')}
            value={notification.phone ?? notification.body ?? '—'}
          />
          {isEmployee && notification.branch_id && (
            <DetailRow
              icon="solar:home-2-bold"
              label={t('notifications.branchId')}
              value={notification.branch_id.slice(0, 12) + '…'}
            />
          )}
          {!isEmployee && notification.entity_name && (
            <DetailRow
              icon={notification.type === 'kitchen_pending'
                ? 'solar:chef-hat-bold'
                : 'solar:buildings-2-bold'}
              label={notification.type === 'kitchen_pending' ? t('notifications.kitchenName') : t('notifications.companyName')}
              value={notification.entity_name}
            />
          )}
          <DetailRow
            icon="solar:calendar-bold"
            label={t('notifications.requestTime')}
            value={fDateTime(notification.created_at)}
          />
          <DetailRow
            icon="solar:shield-check-bold"
            label={t('notifications.status')}
            value={isActed ? t('notifications.processed') : t('notifications.pending')}
            valueColor={isActed ? 'success.main' : 'warning.main'}
          />
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" size="small">
          {t('notifications.close')}
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
              {t('notifications.decline')}
            </LoadingButton>
            <LoadingButton
              size="small"
              variant="contained"
              color="success"
              loading={busy === 'approve'}
              disabled={busy !== null}
              onClick={handleApprove}
            >
              {t('notifications.approve')}
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
  const { t } = useTranslate('common');
  const [detailOpen, setDetailOpen] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);

  const isPending =
    notification.type === 'kitchen_pending' ||
    notification.type === 'company_pending' ||
    notification.type === 'employee_pending' ||
    notification.type === 'kitchen_connection_pending';
  const isAwaitingAction = notification.action_status === 'pending';
  const entityLabel =
    notification.type === 'kitchen_pending'
      ? t('navigation.kitchens')
      : notification.type === 'company_pending'
        ? t('navigation.companies')
      : notification.type === 'kitchen_connection_pending' ? t('notifications.partnership') : t('user.employee');
  const icon =
    notification.type === 'kitchen_pending'
      ? 'custom:fast-food-fill'
      : notification.type === 'company_pending'
        ? 'solar:buildings-bold'
        : 'solar:user-plus-bold';
  const iconColor =
    notification.type === 'kitchen_pending'
      ? 'success'
      : notification.type === 'company_pending'
        ? 'warning'
        : 'info';

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

        <Box
          sx={{
            mr: 2,
            width: 44,
            height: 44,
            display: 'grid',
            flexShrink: 0,
            borderRadius: 1.5,
            placeItems: 'center',
            color: `${iconColor}.main`,
            bgcolor: `${iconColor}.lighter`,
          }}
        >
          <Iconify icon={icon as any} width={24} />
        </Box>

        {/* Content */}
        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
          <Typography variant="body2" sx={{ pr: notification.isUnRead ? 2 : 0 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              {notification.subject}
            </Box>{' '}
            <Box component="span">{t('notifications.requestSent')}</Box>
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
            <Typography variant="caption" color="text.disabled">
              <Box
                component="span"
                title={dayjs(notification.created_at).format('DD MMM YYYY, HH:mm:ss')}
              >
                {formatNotificationTime(notification.created_at)}
              </Box>
            </Typography>
            <Typography variant="caption" color="text.disabled">·</Typography>
            <Typography variant="caption" color="text.secondary">
              {entityLabel}
            </Typography>
          </Box>

          {isPending && isAwaitingAction && (
            <Box sx={{ gap: 1, mt: 1, display: 'flex' }} onClick={(e) => e.stopPropagation()}>
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={busy !== null}
                onClick={handleApprove}
              >
                {busy === 'approve' ? '...' : t('notifications.approve')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={busy !== null}
                onClick={handleDecline}
              >
                {busy === 'decline' ? '...' : t('notifications.decline')}
              </Button>
            </Box>
          )}

          {!isAwaitingAction && (
            <Chip
              size="small"
              variant="soft"
              sx={{ mt: 1 }}
              color={notification.action_status === 'approved' ? 'success' : 'error'}
              label={notification.action_status === 'approved' ? t('notifications.approved') : t('notifications.declined')}
            />
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
