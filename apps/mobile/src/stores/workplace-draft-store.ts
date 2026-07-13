import { create } from 'zustand';

import type { BranchInfo } from '@/types/domain';

export type WorkplaceDraft = {
  companyId: string;
  companyName: string;
  branches: BranchInfo[];
};

type WorkplaceDraftState = {
  draft: WorkplaceDraft | null;
  setDraft: (draft: WorkplaceDraft) => void;
  clearDraft: () => void;
};

export const useWorkplaceDraftStore = create<WorkplaceDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
