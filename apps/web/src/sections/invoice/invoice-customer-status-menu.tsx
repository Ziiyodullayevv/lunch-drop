import type { InvoiceStatus } from 'src/lib/api/orders';

import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { useTranslate } from 'src/locales';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

type Props = {
  status: InvoiceStatus;
  loading?: boolean;
  onChange: (status: InvoiceStatus) => void;
};

export function InvoiceCustomerStatusMenu({ status, loading, onChange }: Props) {
  const { t } = useTranslate('common');
  const menu = usePopover();

  return (
    <>
      <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label variant="soft" color={status === 'paid' ? 'success' : 'warning'}>
          {t(`invoiceCustomers.${status}`)}
        </Label>
        <IconButton
          onClick={menu.onOpen}
          disabled={loading}
          sx={{ ...(menu.open && { bgcolor: 'action.hover' }) }}
        >
          {loading
            ? <CircularProgress size={18} />
            : <Iconify icon="eva:more-vertical-fill" />}
        </IconButton>
      </Box>

      <CustomPopover
        open={menu.open}
        anchorEl={menu.anchorEl}
        onClose={menu.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList sx={{ minWidth: 170 }}>
          <MenuItem
            selected={status === 'paid'}
            onClick={() => {
              onChange('paid');
              menu.onClose();
            }}
          >
            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
            {t('invoiceCustomers.paid')}
          </MenuItem>
          <MenuItem
            selected={status === 'pending'}
            onClick={() => {
              onChange('pending');
              menu.onClose();
            }}
          >
            <Iconify icon="solar:clock-circle-bold" sx={{ color: 'warning.main' }} />
            {t('invoiceCustomers.pending')}
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
