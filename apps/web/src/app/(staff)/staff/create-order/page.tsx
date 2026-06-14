'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMenu, createOrder } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

const STORE_ID = 'store-001';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  prepTime?: number;
}

interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  items: MenuItem[];
}

interface OrderEntry {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function StaffCreateOrderPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedTable, setSelectedTable] = useState('A01');
  const [orderItems, setOrderItems] = useState<OrderEntry[]>([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await getMenu(STORE_ID);
      setCategories(data);
      if (data.length > 0) setActiveCategory(data[0].id);
    } catch {
      setCategories(MOCK_CATS);
      setActiveCategory(MOCK_CATS[0].id);
    } finally {
      setLoading(false);
    }
  };

  const activeItems = categories.find((c) => c.id === activeCategory)?.items || [];
  const filteredItems = search
    ? categories.flatMap((c) => c.items).filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : activeItems;

  const getQty = (itemId: string) => orderItems.find((o) => o.menuItemId === itemId)?.quantity || 0;

  const updateQty = (item: MenuItem, delta: number) => {
    setOrderItems((prev) => {
      const existing = prev.find((o) => o.menuItemId === item.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter((o) => o.menuItemId !== item.id);
        return prev.map((o) => o.menuItemId === item.id ? { ...o, quantity: newQty } : o);
      }
      if (delta > 0) {
        return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
      }
      return prev;
    });
  };

  const totalQty = orderItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (orderItems.length === 0) return;
    setSubmitting(true);
    try {
      await createOrder({
        storeId: STORE_ID,
        tableId: selectedTable,
        source: 'staff',
        items: orderItems.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      router.push('/staff/orders');
    } catch (err) {
      alert('Lỗi tạo order');
    } finally {
      setSubmitting(false);
    }
  };

  const tables = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'B01', 'B02', 'B03'];

  return (
    <div className="min-h-screen pb-64">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Tạo Order</h1>
        </div>
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="bg-orange-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold outline-none"
        >
          {tables.map((t) => (
            <option key={t} value={t}>Bàn {t}</option>
          ))}
        </select>
      </header>

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm món..."
            className="w-full bg-dark-600 border border-dark-400 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Categories */}
      {!search && (
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border',
                activeCategory === cat.id
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-dark-600 border-dark-400 text-gray-400',
              )}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Menu Items */}
      <div className="px-4 space-y-2">
        {filteredItems.map((item) => {
          const qty = getQty(item.id);
          return (
            <div key={item.id} className="bg-dark-600 rounded-xl p-3 flex items-center gap-3 border border-dark-400">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                🍽️
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="text-xs text-orange-500 font-semibold">{formatVND(item.price)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item, -1)}
                  className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold border',
                    qty > 0 ? 'bg-orange-500 border-orange-500 text-white' : 'bg-dark-500 border-dark-400 text-gray-500',
                  )}
                >
                  −
                </button>
                <span className="text-sm font-semibold min-w-[16px] text-center">{qty}</span>
                <button
                  onClick={() => updateQty(item, 1)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold bg-orange-500 border border-orange-500 text-white"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary Panel */}
      {orderItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 border-t border-dark-400 rounded-t-2xl z-50">
          <div className="w-9 h-1 bg-dark-400 rounded-full mx-auto mt-2"></div>
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">🧾 Đơn hàng</h3>
              <span className="text-xs text-gray-400">{totalQty} món</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5 mb-3">
              {orderItems.map((item) => (
                <div key={item.menuItemId} className="flex justify-between items-center text-xs p-2 bg-dark-600 rounded-lg">
                  <span className="text-gray-300">
                    <span className="text-orange-500 font-semibold">{item.quantity}x</span> {item.name}
                  </span>
                  <span className="text-gray-500">{formatVND(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center py-2.5 border-t border-dark-400 mb-3">
              <span className="text-sm text-gray-400">Tổng cộng</span>
              <span className="text-lg font-bold text-orange-500">{formatVND(totalAmount)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 bg-orange-500 rounded-xl text-sm font-semibold text-white disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {submitting ? '⏳ Đang gửi...' : 'Gửi đến bếp →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Mock =====
const MOCK_CATS: MenuCategory[] = [
  { id: 'c1', name: 'Món ngon', icon: '🍖', items: [
    { id: 'i1', name: 'Bò nướng tảng', price: 250000, prepTime: 15 },
    { id: 'i2', name: 'Mực nướng muối ớt', price: 250000, prepTime: 12 },
    { id: 'i3', name: 'Bò lúc lắc', price: 180000, prepTime: 10 },
    { id: 'i4', name: 'Sườn nướng', price: 200000, prepTime: 15 },
    { id: 'i5', name: 'Thát bát cá lóc', price: 220000, prepTime: 20 },
  ]},
  { id: 'c2', name: 'Bia', icon: '🍺', items: [
    { id: 'i6', name: 'Tiger Bạc', price: 25000, prepTime: 1 },
    { id: 'i7', name: 'Heineken', price: 30000, prepTime: 1 },
    { id: 'i8', name: 'Bia Sài Gòn', price: 18000, prepTime: 1 },
    { id: 'i9', name: 'Tiger Nâu', price: 22000, prepTime: 1 },
  ]},
  { id: 'c3', name: 'Món nhậu', icon: '🍢', items: [
    { id: 'i10', name: 'Cánh gà chiên mắm', price: 155000, prepTime: 12 },
    { id: 'i11', name: 'Nem chua rán', price: 85000, prepTime: 8 },
    { id: 'i12', name: 'Đậu phộng rang tỏi', price: 35000, prepTime: 3 },
  ]},
  { id: 'c4', name: 'Hải sản', icon: '🦐', items: [
    { id: 'i13', name: 'Tôm hùm đúc lò', price: 450000, prepTime: 20 },
    { id: 'i14', name: 'Ngao hấp sả', price: 120000, prepTime: 10 },
  ]},
  { id: 'c5', name: 'Lẩu', icon: '🍲', items: [
    { id: 'i15', name: 'Lẩu hải sản chua cay', price: 450000, prepTime: 18 },
    { id: 'i16', name: 'Lẩu bò nhúng dấm', price: 380000, prepTime: 15 },
  ]},
];
