const STORAGE_KEY = 'recently_created_branches';

export type RecentBranch = {
  id: string;
  companyId: string;
};

export function getRecentBranches(): RecentBranch[] {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];

    return Array.isArray(parsed)
      ? parsed.filter(
          (branch): branch is RecentBranch =>
            typeof branch?.id === 'string' && typeof branch?.companyId === 'string'
        )
      : [];
  } catch {
    return [];
  }
}

export function addRecentBranch(branch: RecentBranch) {
  const branches = getRecentBranches().filter((item) => item.id !== branch.id);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...branches, branch]));
}

export function removeRecentBranches(ids: string[]) {
  const idSet = new Set(ids);
  const remaining = getRecentBranches().filter((branch) => !idSet.has(branch.id));

  if (remaining.length > 0) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
