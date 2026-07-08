import { create } from 'zustand';

import type { MenuItem } from '@/types/domain';

export type DraftItem = {
  menuItem: MenuItem;
  quantity: number;
};

type DraftOrderState = {
  items: DraftItem[];
  kitchenName: string;
  addItem: (menuItem: MenuItem, kitchenName: string, quantity?: number) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
};

export const useDraftOrderStore = create<DraftOrderState>()((set) => ({
  items: [],
  kitchenName: '',
  addItem: (menuItem, kitchenName, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.menuItem.id === menuItem.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return {
          items: newQty <= 0
            ? state.items.filter((i) => i.menuItem.id !== menuItem.id)
            : state.items.map((i) =>
                i.menuItem.id === menuItem.id ? { ...i, quantity: newQty } : i
              ),
          kitchenName: kitchenName || state.kitchenName,
        };
      }
      return { items: [...state.items, { menuItem, quantity }], kitchenName };
    }),
  removeItem: (menuItemId) =>
    set((state) => ({ items: state.items.filter((i) => i.menuItem.id !== menuItemId) })),
  clear: () => set({ items: [], kitchenName: '' }),
}));
