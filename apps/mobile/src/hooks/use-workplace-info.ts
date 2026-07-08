import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { listCompanies } from '@/lib/api/onboarding';
import { mapBranchInfo } from '@/lib/api/mappers';
import { useAuthStore } from '@/stores/auth-store';
import type { CurrentUser } from '@/types/domain';

const WORKPLACE_STALE_TIME = 24 * 60 * 60 * 1000;

export function useWorkplaceInfoBackfill() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const shouldBackfillCompany = Boolean(user?.companyId && !user.companyName);

  const companiesQuery = useQuery({
    queryKey: ['workplace-info', 'company', user?.companyId],
    queryFn: listCompanies,
    enabled: shouldBackfillCompany,
    staleTime: WORKPLACE_STALE_TIME,
    gcTime: WORKPLACE_STALE_TIME,
  });

  useEffect(() => {
    if (!user?.companyId || user.companyName || !companiesQuery.data) return;

    const company = companiesQuery.data.find((item) => item.id === user.companyId);
    if (!company) return;

    const patch: Partial<CurrentUser> = { companyName: company.name };

    if ((user.branches ?? []).length === 0 && user.branchId) {
      const branch = company.branches.find((item) => item.id === user.branchId);
      if (branch) {
        patch.branchName = branch.name;
        patch.branchAddress = branch.address;
        patch.branches = [mapBranchInfo(branch)];
      }
    }

    updateUser(patch);
  }, [companiesQuery.data, updateUser, user?.branchId, user?.branches, user?.companyId, user?.companyName]);

  return {
    isBackfillingCompany: shouldBackfillCompany && companiesQuery.isFetching,
  };
}
