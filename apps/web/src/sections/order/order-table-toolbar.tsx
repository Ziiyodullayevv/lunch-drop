import type { SelectChangeEvent } from '@mui/material/Select';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IOrderTableFilters } from 'src/types/order';

import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

type SelectOption = { id: string; name: string };

type Props = {
  onResetPage: () => void;
  filters: UseSetStateReturn<IOrderTableFilters>;
  options: {
    companies: SelectOption[];
    branches: SelectOption[];
  };
  isSuperAdmin: boolean;
};

export function OrderTableToolbar({ filters, options, onResetPage, isSuperAdmin }: Props) {
  const { t } = useTranslate('common');
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onResetPage();
      updateFilters({ name: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  const handleCompany = useCallback(
    (event: SelectChangeEvent<string>) => {
      onResetPage();
      updateFilters({ company_id: event.target.value, branch_id: '' });
    },
    [onResetPage, updateFilters]
  );

  const handleBranch = useCallback(
    (event: SelectChangeEvent<string>) => {
      onResetPage();
      updateFilters({ branch_id: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  return (
    <Box
      sx={{
        p: 2.5,
        gap: 2,
        display: 'flex',
        pr: { xs: 2.5, md: 2.5 },
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-end', md: 'center' },
      }}
    >
      {isSuperAdmin && (
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
          <InputLabel>{t('map.company')}</InputLabel>
          <Select
            label={t('map.company')}
            value={currentFilters.company_id}
            onChange={handleCompany}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {options.companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
        <InputLabel>{t('map.branch')}</InputLabel>
        <Select
          label={t('map.branch')}
          value={currentFilters.branch_id}
          onChange={handleBranch}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {options.branches.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        value={currentFilters.name}
        onChange={handleSearch}
        placeholder={t('order.search')}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
