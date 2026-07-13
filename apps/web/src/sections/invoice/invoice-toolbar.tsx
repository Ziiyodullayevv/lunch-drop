import type { IInvoice } from 'src/types/invoice';

import dynamic from 'next/dynamic';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const InvoicePDFDownload = dynamic(
  () => import('./invoice-pdf').then((mod) => mod.InvoicePDFDownload),
  { ssr: false }
);

const InvoicePDFViewer = dynamic(
  () => import('./invoice-pdf').then((mod) => mod.InvoicePDFViewer),
  { ssr: false }
);

type Props = {
  invoice?: IInvoice;
  currentStatus: string;
};

export function InvoiceToolbar({ invoice, currentStatus }: Props) {
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const renderDownloadButton = () =>
    invoice ? <InvoicePDFDownload invoice={invoice} currentStatus={currentStatus} /> : null;

  const renderDetailsDialog = () => (
    <Dialog fullScreen open={open}>
      <Box sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
        <DialogActions sx={{ p: 1.5 }}>
          <Button color="inherit" variant="contained" onClick={onClose}>
            Yopish
          </Button>
        </DialogActions>
        <Box sx={{ flexGrow: 1, height: 1, overflow: 'hidden' }}>
          {invoice && <InvoicePDFViewer invoice={invoice} currentStatus={currentStatus} />}
        </Box>
      </Box>
    </Dialog>
  );

  return (
    <>
      <Box
        sx={{
          gap: 3,
          display: 'flex',
          mb: { xs: 3, md: 5 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-end', sm: 'center' },
        }}
      >
        <Box
          sx={{
            gap: 1,
            width: 1,
            flexGrow: 1,
            display: 'flex',
          }}
        >
          <Tooltip title="PDF ko‘rish">
            <IconButton onClick={onOpen}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          {renderDownloadButton()}

          <Tooltip title="Chop etish">
            <IconButton onClick={() => window.print()}>
              <Iconify icon="solar:printer-minimalistic-bold" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {renderDetailsDialog()}
    </>
  );
}
