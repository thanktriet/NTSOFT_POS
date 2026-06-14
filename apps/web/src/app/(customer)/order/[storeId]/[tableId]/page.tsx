'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cart.store';
import { getMenu } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';
import Link from 'next/link';

interface MenuOption {
  id: string;
  groupName: string;
  name: string;
  price: number;
  isRequired: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  prepTime?: number;
  options: MenuOption[];
}

interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  items: MenuItem[];
}

export default function CustomerMenuPage({
  params,
}: {
  params: { storeId: string; tableId: string };
}) {
  const { storeId, tableId } = params;
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

  const cart = useCartStore();
  const totalItems = cart.totalItems();
  const totalAmount = cart.totalAmount();

  useEffect(() => {
    cart.setTable(storeId, tableId);
    loadMenu();
  }, [storeId]);

  const loadMenu = async () => {
    try {
      const data = await getMenu(storeId);
      setCategories(data);
      if (data.length > 0) setActiveCategory(data[0].id);
    } catch (err) {
      console.error('Failed to load menu:', err);
      // Use mock data for preview
      setCategories(MOCK_MENU);
      setActiveCategory(MOCK_MENU[0].id);
    } finally {
      setLoading(false);
    }
  };

  const activeItems = categories.find((c) => c.id === activeCategory)?.items || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Đang tải menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center text-orange-500 text-[10px] font-bold">
            NT
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Nam Thắng Beer & Food</h1>
            <span className="text-xs text-gray-500">Bàn {tableId}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="text-lg">🔍</button>
          <Link href={`/order/${storeId}/${tableId}/tracking`} className="text-lg">🔔</Link>
        </div>
      </header>

      {/* Banner */}
      <div className="mx-4 mt-3 rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 p-5 relative">
        <h2 className="text-orange-500 text-xl font-bold leading-tight">BIA LẠNH MÁT</h2>
        <p className="text-white font-bold text-lg">– MÓN NGON CHẤT</p>
        <p className="text-gray-400 text-xs italic mt-1">Cheers cùng bạn bè!</p>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex flex-col items-center gap-1 min-w-[60px]',
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm transition-all',
                activeCategory === cat.id
                  ? 'bg-orange-500 shadow-orange-200'
                  : 'bg-white',
              )}
            >
              {cat.icon || '📋'}
            </div>
            <span
              className={cn(
                'text-[11px] text-center',
                activeCategory === cat.id
                  ? 'text-orange-500 font-semibold'
                  : 'text-gray-500',
              )}
            >
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">
            {categories.find((c) => c.id === activeCategory)?.icon}{' '}
            {categories.find((c) => c.id === activeCategory)?.name}
          </h3>
          <span className="text-xs text-gray-400">{activeItems.length} món</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {activeItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-xl overflow-hidden shadow-sm text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-full h-24 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-3xl">
                {item.image || '🍽️'}
              </div>
              <div className="p-3">
                <h4 className="text-xs font-medium text-gray-800 line-clamp-2 min-h-[32px]">
                  {item.name}
                </h4>
                <p className="text-sm font-bold text-orange-500 mt-1">
                  {formatVND(item.price)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
          <Link
            href={`/order/${storeId}/${tableId}/cart`}
            className="block max-w-[390px] mx-auto bg-orange-500 rounded-xl p-3 shadow-lg shadow-orange-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white text-orange-500 rounded-full flex items-center justify-center text-xs font-bold">
                {totalItems}
              </div>
              <div className="text-white">
                <div className="text-sm font-semibold">{totalItems} món</div>
                <div className="text-xs opacity-90">{formatVND(totalAmount)}</div>
              </div>
            </div>
            <span className="bg-white text-orange-500 px-4 py-2 rounded-lg text-sm font-semibold">
              Xem giỏ hàng →
            </span>
          </Link>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={(item, qty, options, note) => {
            const optionsPrice = options.reduce((s, o) => s + o.price, 0);
            cart.addItem({
              menuItemId: item.id,
              name: item.name,
              price: item.price + optionsPrice,
              quantity: qty,
              note,
              options,
            });
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}

// ===== Item Detail Modal =====

function ItemDetailModal({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: (item: MenuItem, qty: number, options: any[], note: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<MenuOption[]>([]);
  const [note, setNote] = useState('');

  const optionsPrice = selectedOptions.reduce((s, o) => s + o.price, 0);
  const totalPrice = (item.price + optionsPrice) * qty;

  const toggleOption = (option: MenuOption) => {
    setSelectedOptions((prev) => {
      const exists = prev.find((o) => o.id === option.id);
      if (exists) return prev.filter((o) => o.id !== option.id);
      return [...prev, option];
    });
  };

  // Group options by groupName
  const optionGroups = item.options.reduce(
    (groups, opt) => {
      if (!groups[opt.groupName]) groups[opt.groupName] = [];
      groups[opt.groupName].push(opt);
      return groups;
    },
    {} as Record<string, MenuOption[]>,
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-[390px] mx-auto bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="w-full h-48 bg-gradient-to-br from-orange-200 to-orange-100 flex items-center justify-center text-6xl relative">
          {item.image || '🍽️'}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {/* Name + Price */}
          <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {item.prepTime && (
              <span className="text-xs text-gray-400">⏱ {item.prepTime} phút</span>
            )}
          </div>
          <p className="text-xl font-bold text-orange-500 mt-2">{formatVND(item.price)}</p>

          {/* Options */}
          {Object.entries(optionGroups).map(([group, options]) => (
            <div key={group} className="mt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">{group}</h4>
              <div className="space-y-2">
                {options.map((opt) => {
                  const isSelected = selectedOptions.some((o) => o.id === opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(opt)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border transition-all',
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 bg-gray-50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            isSelected ? 'border-orange-500' : 'border-gray-300',
                          )}
                        >
                          {isSelected && (
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          )}
                        </div>
                        <span className="text-sm text-gray-700">{opt.name}</span>
                      </div>
                      {opt.price > 0 && (
                        <span className="text-xs text-orange-500 font-semibold">
                          +{formatVND(opt.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Note */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Ghi chú cho bếp</h4>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Không hành, nướng chín kỹ..."
              className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none h-16 outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex items-center gap-3">
          <div className="flex items-center gap-3 bg-gray-100 px-3 py-2 rounded-lg">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-base font-semibold"
            >
              −
            </button>
            <span className="text-base font-semibold min-w-[20px] text-center">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-base font-semibold"
            >
              +
            </button>
          </div>
          <button
            onClick={() => onAdd(item, qty, selectedOptions, note)}
            className="flex-1 bg-orange-500 text-white py-3 rounded-lg text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            Thêm · {formatVND(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Mock data for preview =====
const MOCK_MENU: MenuCategory[] = [
  {
    id: 'cat-1',
    name: 'Món ngon',
    icon: '🍖',
    items: [
      { id: 'item-1', name: 'Bò nướng tảng', price: 250000, prepTime: 15, options: [
        { id: 'opt-1', groupName: 'Size', name: 'Size thường (300g)', price: 0, isRequired: true },
        { id: 'opt-2', groupName: 'Size', name: 'Size lớn (500g)', price: 100000, isRequired: true },
        { id: 'opt-3', groupName: 'Topping', name: 'Thêm phô mai', price: 20000, isRequired: false },
      ]},
      { id: 'item-2', name: 'Mực nướng muối ớt', price: 250000, prepTime: 12, options: [] },
      { id: 'item-3', name: 'Bò lúc lắc', price: 180000, prepTime: 10, options: [] },
      { id: 'item-4', name: 'Sườn nướng', price: 200000, prepTime: 15, options: [] },
      { id: 'item-5', name: 'Thát bát cá lóc', price: 220000, prepTime: 20, options: [] },
      { id: 'item-6', name: 'Bàn chân gà', price: 180000, prepTime: 10, options: [] },
    ],
  },
  {
    id: 'cat-2',
    name: 'Bia',
    icon: '🍺',
    items: [
      { id: 'item-7', name: 'Tiger Bạc', price: 25000, prepTime: 1, options: [] },
      { id: 'item-8', name: 'Heineken', price: 30000, prepTime: 1, options: [] },
      { id: 'item-9', name: 'Bia Sài Gòn', price: 18000, prepTime: 1, options: [] },
      { id: 'item-10', name: 'Tiger Nâu', price: 22000, prepTime: 1, options: [] },
    ],
  },
  {
    id: 'cat-3',
    name: 'Món nhậu',
    icon: '🍢',
    items: [
      { id: 'item-11', name: 'Cánh gà chiên mắm', price: 155000, prepTime: 12, options: [] },
      { id: 'item-12', name: 'Nem chua rán', price: 85000, prepTime: 8, options: [] },
      { id: 'item-13', name: 'Đậu phộng rang tỏi', price: 35000, prepTime: 3, options: [] },
    ],
  },
  {
    id: 'cat-4',
    name: 'Hải sản',
    icon: '🦐',
    items: [
      { id: 'item-14', name: 'Tôm hùm đúc lò', price: 450000, prepTime: 20, options: [] },
      { id: 'item-15', name: 'Ngao hấp sả', price: 120000, prepTime: 10, options: [] },
    ],
  },
  {
    id: 'cat-5',
    name: 'Lẩu',
    icon: '🍲',
    items: [
      { id: 'item-16', name: 'Lẩu hải sản chua cay', price: 450000, prepTime: 18, options: [] },
      { id: 'item-17', name: 'Lẩu bò nhúng dấm', price: 380000, prepTime: 15, options: [] },
    ],
  },
];
