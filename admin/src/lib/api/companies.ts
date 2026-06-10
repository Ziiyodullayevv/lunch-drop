
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
  return axiosInstance.post(endpoints.superAdmin.assignKitchens(branchId), { kitchen_ids });
}

// ------------------ company_admin ------------------

export function fetchCompanyMe() {
  return fetcher<CompanyRead>(endpoints.company.me);
}

export function fetchCompanyBranchesList(params?: { limit?: number; offset?: number }) {
  return fetcher<PageBranch>([endpoints.company.branches, { params }]);
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
  is_active: boolean;
  order_cutoff_time: string;
  delivery_start_time: string;
  delivery_end_time: string;
  created_at: string;
};

export type PageCompanyKitchen = {
  items: CompanyKitchenRead[];
  total: number;
  limit: number;
  offset: number;
};

export function fetchCompanyKitchens() {
  return fetcher<CompanyKitchenRead[]>(endpoints.company.kitchens);
}

export function fetchCompanyBranchKitchens(branchId: string) {
  return fetcher<CompanyKitchenRead[]>(endpoints.company.branchKitchens(branchId));
}

export function assignCompanyBranchKitchens(branchId: string, kitchen_ids: string[]) {
  return axiosInstance
    .post<CompanyKitchenRead[]>(endpoints.company.assignKitchens(branchId), { kitchen_ids })
    .then((r) => r.data);
}
