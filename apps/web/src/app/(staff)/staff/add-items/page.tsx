'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMenu, addItemsToOrder } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

const STORE_ID = 'store-001';

interface MenuItem {
  id: string;
  name: string;
  price: number;
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
  note?: string;
}

export default function AddItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const tableName = searchParams.get('table') || '';

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [orderItems, setOrderItems] = useState<OrderEntry[]>([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { loadMenu(); }, []);

  const loadMenu = async () => {
    try {
      const data = await getMenu(STORE_ID);
      setCategories(data);
      if (data.length > 0) setActiveCategory(data[0].id);
    } catch {}
  };

  const activeItems = categories.find((c) => c.id === activeCategory)?.items || [];
  const filteredItems = search
    ? categories.flatMap((c) => c.items).filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : activeItems;

  const getQty = (id: string) => orderItems.find((o) => o.menuItemId === id)?.quantity || 0;

  const updateQty = (item: MenuItem, delta: number) => {
    setOrderItems((prev) => {
      const existing = prev.find((o) => o.menuItemId === item.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter((o) => o.menuItemId !== item.id);
        return prev.map((o) => o.menuItemId === item.id ? { ...o, quantity: newQty } : o);
      }
      if (delta > 0) return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
      return prev;
    });
  };

  const totalQty = orderItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (orderItems.length === 0 || !orderId) return;
    setSubmitting(true);
    try {
      await addItemsToOrder(orderId, orderItems.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        note: i.note,
      })));
      setMessage('✅ Đã thêm món!');
      setTimeout(() => router.push('/staff/orders'), 1000);
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Lỗi'}`);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen pb-56">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff/orders" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Thêm món</h1>
        </div>
        <span className="bg-orange-500 text-white px-3 py-1 rounded-md text-xs font-semibold">
          Bàn {tableName}
        </span>
      </header>

      {message && (
        <div className="mx-4 mt-3 p-2.5 bg-dark-700 border border-dark-400 rounded-lg text-xs text-center animate-fadeIn">
          {message}
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Tìm món..."
          className="w-full bg-dark-600 border border-dark-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500"
        />
      </div>

      {/* Categories */}
      {!search && (
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn('px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border', activeCategory === cat.id ? 'bg-orange-500 border-orange-500 text-white' : 'bg-dark-600 border-dark-400 text-gray-400')}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="px-4 space-y-2">
        {filteredItems.map((item) => {
          const qty = getQty(item.id);
          return (
            <div key={item.id} className="bg-dark-600 rounded-xl p-3 flex items-center gap-3 border border-dark-400">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="text-xs text-orange-500 font-semibold">{formatVND(item.price)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item, -1)} className={cn('w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold border', qty > 0 ? 'bg-orange-500 border-orange-500 text-white' : 'bg-dark-500 border-dark-400 text-gray-500')}>−</button>
                <span className="text-sm font-semibold min-w-[16px] text-center">{qty}</span>
                <button onClick={() => updateQty(item, 1)} className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold bg-orange-500 border border-orange-500 text-white">+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Panel */}
      {orderItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 border-t border-dark-400 p-4 animate-slideUp">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold">{totalQty} món · {formatVND(totalAmount)}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 bg-orange-500 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? '⏳ Đang gửi...' : 'Gửi thêm món đến bếp →'}
          </button>
        </div>
      )}
    </div>
  );
}
