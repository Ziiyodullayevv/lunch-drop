import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';
import type { CartItem, MenuItem } from '@/types/domain';

type CartState = {
  items: CartItem[];
  addItem: (menuItem: MenuItem, kitchenName: string, quantity?: number) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (menuItem, kitchenName, quantity = 1) =>
        set((state) => {
          const existingDates = new Set(
            state.items.map((item) => item.menuItem.targetDate).filter(Boolean),
          );
          if (
            existingDates.size > 0 &&
            menuItem.targetDate &&
            !existingDates.has(menuItem.targetDate)
          ) {
            return state;
          }
          const existing = state.items.find((item) => item.menuItem.id === menuItem.id);

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.menuItem.id === menuItem.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }

          return {
            items: [...state.items, { menuItem, kitchenName, quantity }],
          };
        }),
      updateQuantity: (menuItemId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.menuItem.id !== menuItemId)
              : state.items.map((item) =>
                  item.menuItem.id === menuItemId ? { ...item, quantity } : item,
                ),
        })),
      removeItem: (menuItemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.menuItem.id !== menuItemId),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'cart',
      storage: createJSONStorage(() => storage),
    },
  ),
);

export function useCart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const subtotal = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const kitchenIds = new Set(items.map((item) => item.menuItem.kitchenId));
  const hasMixedKitchens = kitchenIds.size > 1;

  return {
    items,
    subtotal,
    itemCount,
    hasMixedKitchens,
    kitchenId: items[0]?.menuItem.kitchenId ?? null,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  };
}
