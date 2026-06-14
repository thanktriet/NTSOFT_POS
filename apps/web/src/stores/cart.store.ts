import { create } from 'zustand';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number; // unit price including options
  quantity: number;
  note?: string;
  options: Array<{ name: string; price: number; groupName: string }>;
  image?: string;
}

interface CartStore {
  items: CartItem[];
  storeId: string | null;
  tableId: string | null;

  // Actions
  setTable: (storeId: string, tableId: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNote: (menuItemId: string, note: string) => void;
  clearCart: () => void;

  // Computed
  totalItems: () => number;
  totalAmount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  storeId: null,
  tableId: null,

  setTable: (storeId, tableId) => set({ storeId, tableId }),

  addItem: (item) =>
    set((state) => {
      // Check if same item with same options exists
      const existingIndex = state.items.findIndex(
        (i) =>
          i.menuItemId === item.menuItemId &&
          JSON.stringify(i.options) === JSON.stringify(item.options),
      );

      if (existingIndex >= 0) {
        const updated = [...state.items];
        updated[existingIndex].quantity += item.quantity;
        return { items: updated };
      }

      return { items: [...state.items, item] };
    }),

  removeItem: (menuItemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.menuItemId !== menuItemId),
    })),

  updateQuantity: (menuItemId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.menuItemId !== menuItemId) };
      }
      return {
        items: state.items.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity } : i,
        ),
      };
    }),

  updateNote: (menuItemId, note) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.menuItemId === menuItemId ? { ...i, note } : i,
      ),
    })),

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  totalAmount: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
