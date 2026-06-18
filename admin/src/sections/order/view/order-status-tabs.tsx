import type { LabelColor } from 'src/components/label';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export type OrderStatusTab = {
  value: string;
  label: string;
  color?: LabelColor;
};

type Props = {
  value: string;
  tabs: OrderStatusTab[];
  counts: Record<string, number>;
  onChange: (value: string) => void;
};

export function OrderStatusTabs({ value, tabs, counts, onChange }: Props) {
  return (
    <Tabs
      value={value}
      onChange={(_, nextValue) => onChange(nextValue)}
      sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={tab.label}
          iconPosition="end"
          icon={
            <Label
              variant={value === tab.value ? 'filled' : 'soft'}
              color={tab.color ?? 'default'}
              sx={{ ml: 0.5 }}
            >
              {counts[tab.value] ?? 0}
            </Label>
          }
        />
      ))}
    </Tabs>
  );
}
