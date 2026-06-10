import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IOrderTableFilters } from 'src/types/order';
import type { FiltersResultProps } from 'src/components/filters-result';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type SelectOption = { id: string; name: string };

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IOrderTableFilters>;
  options?: {
    companies?: SelectOption[];
    branches?: SelectOption[];
  };
};

export function OrderTableFiltersResult({ filters, totalResults, onResetPage, sx, options }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;

  const handleRemoveSearch = useCallback(() => {
    onResetPage();
    updateFilters({ name: '' });
  }, [onResetPage, updateFilters]);

  const handleRemoveCompany = useCallback(() => {
    onResetPage();
    updateFilters({ company_id: '', branch_id: '' });
  }, [onResetPage, updateFilters]);

  const handleRemoveBranch = useCallback(() => {
    onResetPage();
    updateFilters({ branch_id: '' });
  }, [onResetPage, updateFilters]);

  const handleReset = useCallback(() => {
    onResetPage();
    resetFilters();
  }, [onResetPage, resetFilters]);

  const companyName = options?.companies?.find((c) => c.id === currentFilters.company_id)?.name ?? currentFilters.company_id;
  const branchName = options?.branches?.find((b) => b.id === currentFilters.branch_id)?.name ?? currentFilters.branch_id;

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Kompaniya:" isShow={!!currentFilters.company_id}>
        <Chip {...chipProps} label={companyName} onDelete={handleRemoveCompany} />
      </FiltersBlock>

      <FiltersBlock label="Filial:" isShow={!!currentFilters.branch_id}>
        <Chip {...chipProps} label={branchName} onDelete={handleRemoveBranch} />
      </FiltersBlock>

      <FiltersBlock label="Qidiruv:" isShow={!!currentFilters.name}>
        <Chip {...chipProps} label={currentFilters.name} onDelete={handleRemoveSearch} />
      </FiltersBlock>
    </FiltersResult>
  );
}
