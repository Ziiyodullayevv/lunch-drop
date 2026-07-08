import type { CompanyBranchDto, CompanyWithBranchesDto, EmployeeStatusDto } from '@/types/api';

import { apiClient } from './client';

export type { CompanyBranchDto, CompanyWithBranchesDto };

export type JoinBranchResponse = EmployeeStatusDto;

export async function listCompanies(): Promise<CompanyWithBranchesDto[]> {
  const res = await apiClient.get<CompanyWithBranchesDto[]>('/employee/companies');
  return res.data;
}

export async function listCompanyBranches(companyId: string): Promise<CompanyBranchDto[]> {
  const companies = await listCompanies();
  return companies.find((c) => c.id === companyId)?.branches ?? [];
}

export async function getEmployeeStatus(): Promise<EmployeeStatusDto> {
  const res = await apiClient.get<EmployeeStatusDto>('/employee/status');
  return res.data;
}

export async function joinBranches(branchIds: string[]): Promise<JoinBranchResponse> {
  const res = await apiClient.post<JoinBranchResponse>('/employee/join-branch', {
    branch_ids: branchIds,
  });
  return res.data;
}
