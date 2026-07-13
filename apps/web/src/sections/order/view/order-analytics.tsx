import type { OrderAnalytics as OrderAnalyticsData } from 'src/lib/order-analytics';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import { Scrollbar } from 'src/components/scrollbar';

import { InvoiceAnalytic } from 'src/sections/invoice/invoice-analytic';
import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

type Props = {
  data: OrderAnalyticsData;
};

export function OrderAnalytics({ data }: Props) {
  const { t } = useTranslate('common');
  const percent = (value: number) =>
    data.total ? Math.round((value / data.total) * 100) : 0;

  return (
    <Card sx={{ mb: { xs: 3, md: 5 } }}>
      <Scrollbar sx={{ minHeight: 108 }}>
        <Stack
          divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
          sx={{ py: 2, flexDirection: 'row' }}
        >
          <InvoiceAnalytic
            unit={t('order.unit')}
            currency="UZS"
            title={t('order.total')}
            total={data.total}
            percent={data.total ? 100 : 0}
            price={data.totalAmount}
            icon="solar:bill-list-bold-duotone"
            color="var(--palette-info-main)"
          />
          <InvoiceAnalytic
            unit={t('order.unit')}
            currency="UZS"
            title={t('order.delivered')}
            total={data.delivered}
            percent={percent(data.delivered)}
            price={data.deliveredAmount}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 16 16"
              >
                <path d="M0 0h16v16H0z" fill="none" />
                <path
                  fill="currentColor"
                  d="m4.036 2.49l6.611 2.832L8 6.456L1.427 3.639c.148-.151.329-.273.535-.352zm1.338-.515l1.55-.596a3 3 0 0 1 2.153 0l4.962 1.908c.205.08.386.2.534.352l-2.656 1.138zm9.62 2.572L11.6 6c1.29.023 2.472.49 3.399 1.256v-2.57q0-.07-.007-.14M7.5 7.33v.395A5.48 5.48 0 0 0 6 11.5c0 1.17.365 2.254.988 3.146l-.065-.024l-4.961-1.909a1.5 1.5 0 0 1-.962-1.4V4.687q0-.07.007-.14zM16 11.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m-5.146 1.854l3-3a.5.5 0 0 0-.708-.708L10.5 12.293l-.646-.647a.5.5 0 0 0-.708.708l1 1a.5.5 0 0 0 .708 0"
                />
              </svg>
            }
            color="var(--palette-success-main)"
          />
          <InvoiceAnalytic
            unit={t('order.unit')}
            currency="UZS"
            title={t('order.cancelled')}
            total={data.cancelled}
            percent={percent(data.cancelled)}
            price={data.cancelledAmount}
            icon="ic:baseline-close"
            color="var(--palette-error-main)"
          />
        </Stack>
      </Scrollbar>
    </Card>
  );
}
