
import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export type CompanyRead = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  billing_day: number;
  created_at: string;
};

export type CompanyCreate = {
  name: string;
  description?: string | null;
  logo_url?: string | null;
  billing_day?: number;
};

export type CompanyUpdate = Partial<CompanyCreate>;

export type PageCompany = {
  items: CompanyRead[];
  total: number;
  limit: number;
  offset: number;
};

// ----------------------------------------------------------------------

export function fetchCompanies(params?: { limit?: number; offset?: number; company_id?: string }) {
  return fetcher<PageCompany>([endpoints.superAdmin.companies, { params }]);
}

export function fetchCompany(id: string) {
  return fetcher<CompanyRead>(endpoints.superAdmin.company(id));
}

export function createCompany(body: CompanyCreate) {
  return axiosInstance
    .post<CompanyRead>(endpoints.superAdmin.companies, body)
    .then((r) => r.data);
}

export function updateCompany(id: string, body: CompanyUpdate) {
  return axiosInstance
    .patch<CompanyRead>(endpoints.superAdmin.company(id), body)
    .then((r) => r.data);
}

export function deleteCompany(id: string) {
  return axiosInstance.delete(endpoints.superAdmin.company(id));
}

// ----------------------------------------------------------------------

export type BranchRead = {
  id: string;
  company_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
  kitchen_ids?: string[];
};

// super_admin: company_id majburiy
export type BranchCreate = {
  company_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

// company_admin: company_id yo'q (JWT dan olinadi)
export type CompanyBranchCreate = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type BranchUpdate = {
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type PageBranch = {
  items: BranchRead[];
  total: number;
  limit: number;
  offset: number;
};

// ------------------ super_admin ------------------

export function fetchBranches(params?: { limit?: number; offset?: number; company_id?: string }) {
  return fetcher<PageBranch>([endpoints.superAdmin.branches, { params }]);
}

async function fetchBranchKitchenIds(branchId: string): Promise<string[]> {
  const candidates = [
    endpoints.superAdmin.branchKitchens(branchId),
    endpoints.company.branchKitchens(branchId),
  ];

  for (const endpoint of candidates) {
    try {
      const response = await axiosInstance.get<Array<{ id: string }>>(endpoint);
      return response.data.map((kitchen) => kitchen.id);
    } catch {
      // Some roles/backends do not expose both endpoints. Try the next read path.
    }
  }

  return [];
}

export async function fetchBranchesWithKitchenIds(params?: {
  limit?: number;
  offset?: number;
  company_id?: string;
}) {
  const page = await fetchBranches(params);
  const items = await Promise.all(
    page.items.map(async (branch) => {
      try {
        const detail = await fetchBranch(branch.id);
        const kitchenIds =
          detail.kitchen_ids ?? branch.kitchen_ids ?? (await fetchBranchKitchenIds(branch.id));

        return { ...branch, kitchen_ids: kitchenIds };
      } catch {
        return branch;
      }
    })
  );

  return { ...page, items };
}

export function fetchBranch(id: string) {
  return fetcher<BranchRead>(endpoints.superAdmin.branch(id));
}

export function createBranch(body: BranchCreate) {
  return axiosInstance
    .post<BranchRead>(endpoints.superAdmin.branches, body)
    .then((r) => r.data);
}

export function updateBranch(id: string, body: BranchUpdate) {
  return axiosInstance
    .patch<BranchRead>(endpoints.superAdmin.branch(id), body)
    .then((r) => r.data);
}

export function deleteBranch(id: string) {
  return axiosInstance.delete(endpoints.superAdmin.branch(id));
}

export function assignKitchens(branchId: string, kitchen_ids: string[]) {
  return axiosInstance
    .post<CompanyKitchenRead[]>(endpoints.superAdmin.assignKitchens(branchId), { kitchen_ids })
    .then((r) => r.data);
}

// ------------------ company_admin ------------------

export function fetchCompanyMe() {
  return fetcher<CompanyRead>(endpoints.company.me);
}

export async function fetchCompanyBranchesList(params?: { limit?: number; offset?: number }) {
  const page = await fetcher<PageBranch>([endpoints.company.branches, { params }]);
  const items = await Promise.all(
    page.items.map(async (branch) => {
      try {
        const kitchens = await fetchCompanyBranchKitchens(branch.id);
        return { ...branch, kitchen_ids: kitchens.map((kitchen) => kitchen.id) };
      } catch {
        return branch;
      }
    })
  );
  return { ...page, items };
}

export function fetchCompanyBranch(id: string) {
  return fetcher<BranchRead>(endpoints.company.branch(id));
}

export function createCompanyBranch(body: CompanyBranchCreate) {
  return axiosInstance
    .post<BranchRead>(endpoints.company.branches, body)
    .then((r) => r.data);
}

export function updateCompanyBranch(id: string, body: BranchUpdate) {
  return axiosInstance
    .patch<BranchRead>(endpoints.company.branch(id), body)
    .then((r) => r.data);
}

export function deleteCompanyBranch(id: string) {
  return axiosInstance.delete(endpoints.company.branch(id));
}

// ------------------ company_admin kitchens ------------------

export type CompanyKitchenRead = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  image_url: string | null;
  lat: number;
  lng: number;
  is_active: boolean;
  order_cutoff_time: string;
  delivery_start_time: string;
  delivery_end_time: string;
  created_at: string;
};

export type CompanyKitchenCatalogRead = CompanyKitchenRead & {
  connected_branch_ids: string[];
  pending_branch_ids: string[];
};

export type KitchenConnectionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type KitchenConnectionRead = {
  id: string;
  company_id: string;
  company_name: string;
  branch_id: string;
  branch_name: string;
  kitchen_id: string;
  kitchen_name: string;
  status: KitchenConnectionStatus;
  created_at: string;
  reviewed_at: string | null;
};

export type PageCompanyKitchen = {
  items: CompanyKitchenRead[];
  total: number;
  limit: number;
  offset: number;
};

async function fetchAllPageItems<T>(endpoint: string): Promise<T[]> {
  const limit = 100;
  const firstPage = await fetcher<{ items: T[]; total: number }>([
    endpoint,
    { params: { limit, offset: 0 } },
  ]);
  const remainingPageCount = Math.max(0, Math.ceil(firstPage.total / limit) - 1);
  const remainingPages = await Promise.all(
    Array.from({ length: remainingPageCount }, (_, index) =>
      fetcher<{ items: T[]; total: number }>([
        endpoint,
        { params: { limit, offset: (index + 1) * limit } },
      ])
    )
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}

export async function fetchCompanyKitchens(): Promise<CompanyKitchenRead[]> {
  return fetchAllPageItems<CompanyKitchenRead>(endpoints.company.kitchens);
}

export function fetchCompanyBranchKitchens(branchId: string) {
  return fetcher<CompanyKitchenRead[]>(endpoints.company.branchKitchens(branchId));
}

export async function fetchCompanyKitchenCatalog(): Promise<{
  kitchens: CompanyKitchenCatalogRead[];
  branches: BranchRead[];
}> {
  const [kitchens, branches, requests] = await Promise.all([
    fetchCompanyKitchens(),
    fetchAllPageItems<BranchRead>(endpoints.company.branches),
    fetcher<KitchenConnectionRead[]>(endpoints.company.kitchenConnections),
  ]);
  const branchKitchenLists = await Promise.all(
    branches.map(async (branch) => ({
      branchId: branch.id,
      kitchens: await fetchCompanyBranchKitchens(branch.id),
    }))
  );
  const kitchensById = new Map(kitchens.map((kitchen) => [kitchen.id, kitchen]));
  const connectedBranchesByKitchen = new Map<string, string[]>();

  branchKitchenLists.forEach(({ branchId, kitchens: branchKitchens }) => {
    branchKitchens.forEach((kitchen) => {
      kitchensById.set(kitchen.id, kitchen);
      const branchIds = connectedBranchesByKitchen.get(kitchen.id) ?? [];
      connectedBranchesByKitchen.set(kitchen.id, [...branchIds, branchId]);
    });
  });

  return {
    kitchens: Array.from(kitchensById.values()).map((kitchen) => ({
      ...kitchen,
      connected_branch_ids: connectedBranchesByKitchen.get(kitchen.id) ?? [],
      pending_branch_ids: requests
        .filter((request) => request.kitchen_id === kitchen.id && request.status === 'pending')
        .map((request) => request.branch_id),
    })),
    branches,
  };
}

export function assignCompanyBranchKitchens(branchId: string, kitchen_ids: string[]) {
  return axiosInstance
    .post<CompanyKitchenRead[]>(endpoints.company.assignKitchens(branchId), { kitchen_ids })
    .then((r) => r.data);
}

export function requestCompanyKitchen(branchId: string, kitchenId: string) {
  return axiosInstance
    .post<KitchenConnectionRead>(endpoints.company.requestKitchen(branchId), {
      kitchen_id: kitchenId,
    })
    .then((response) => response.data);
}

export function cancelCompanyKitchenRequest(requestId: string) {
  return axiosInstance
    .delete<KitchenConnectionRead>(endpoints.company.cancelKitchenRequest(requestId))
    .then((response) => response.data);
}

export function disconnectCompanyKitchen(branchId: string, kitchenId: string) {
  return axiosInstance.delete(endpoints.company.disconnectKitchen(branchId, kitchenId));
}

export function fetchCompanyKitchenConnections() {
  return fetcher<KitchenConnectionRead[]>(endpoints.company.kitchenConnections);
}
