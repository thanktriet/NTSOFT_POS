'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

const STORE_ID = 'store-001';

type OrderStatus = 'pending' | 'confirmed' | 'cooking' | 'served' | 'paid' | 'cancelled';

interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  source: 'qr' | 'staff';
  total: number;
  createdAt: string;
  table: { name: string };
  staff?: { name: string };
  items: Array<{ menuItem: { name: string }; quantity: number; unitPrice: number }>;
}

const STATUS_MAP: Record<OrderStatus, { label: string; class: string }> = {
  pending: { label: 'Chờ xác nhận', class: 'bg-red-500/15 text-red-400' },
  confirmed: { label: 'Đã xác nhận', class: 'bg-blue-500/15 text-blue-400' },
  cooking: { label: 'Đang chế biến', class: 'bg-orange-500/15 text-orange-400' },
  served: { label: 'Đã phục vụ', class: 'bg-green-500/15 text-green-400' },
  paid: { label: 'Đã thanh toán', class: 'bg-gray-500/15 text-gray-400' },
  cancelled: { label: 'Đã hủy', class: 'bg-gray-500/15 text-gray-500' },
};

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const data = await api(`/orders/store/${STORE_ID}`, { token });
      setOrders(data);
    } catch {
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? orders
    : orders.filter((o) => o.status === filter);

  const filters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'cooking', label: 'Đang chế biến' },
    { key: 'served', label: 'Đã phục vụ' },
    { key: 'pending', label: 'Chờ TT' },
    { key: 'paid', label: 'Đã TT' },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center gap-3 border-b border-dark-400">
        <Link href="/staff" className="text-xl">←</Link>
        <h1 className="text-base font-semibold">Đơn hàng</h1>
      </header>

      {/* Filters */}
      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border',
              filter === f.key
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-dark-600 border-dark-400 text-gray-400',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="px-4 space-y-3 pb-4">
        {filtered.map((order) => {
          const statusInfo = STATUS_MAP[order.status];
          return (
            <div key={order.id} className="bg-dark-600 rounded-xl p-4 border border-dark-400">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                    {order.table.name}
                  </span>
                  <span className="text-[11px] text-gray-500">#{order.orderNumber.toString().padStart(4, '0')}</span>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusInfo.class)}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1 mb-3">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-300">
                    <span><span className="text-orange-500 font-semibold">{item.quantity}x</span> {item.menuItem.name}</span>
                    <span className="text-gray-500">{formatVND(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-[10px] text-gray-500">+{order.items.length - 3} món khác</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-dark-400">
                <div className="text-[11px] text-gray-500">
                  <span>{order.source === 'qr' ? '📱 QR' : `👤 ${order.staff?.name || ''}`}</span>
                  <span className="ml-2">
                    {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="text-base font-bold text-orange-500">{formatVND(order.total)}</span>
              </div>

              {/* Actions */}
              {order.status !== 'paid' && order.status !== 'cancelled' && (
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-2 bg-dark-500 rounded-lg text-[11px] font-semibold text-gray-400">
                    Chi tiết
                  </button>
                  {order.status !== 'served' && (
                    <button className="flex-1 py-2 bg-blue-500 rounded-lg text-[11px] font-semibold text-white">
                      + Thêm món
                    </button>
                  )}
                  <button className="flex-1 py-2 bg-green-500 rounded-lg text-[11px] font-semibold text-white">
                    Thanh toán
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <span className="text-3xl">📋</span>
            <p className="text-sm text-gray-500 mt-2">Không có đơn hàng</p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 flex justify-around py-2.5 pb-3.5 border-t border-dark-400 z-50">
        <NavItem icon="🏠" label="Trang chủ" href="/staff" />
        <NavItem icon="🪑" label="Bàn" href="/staff/tables" />
        <NavItem icon="📝" label="Order" href="/staff/create-order" />
        <NavItem icon="📊" label="Đơn hàng" active />
        <NavItem icon="👤" label="Tài khoản" href="/staff/account" />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active, href }: { icon: string; label: string; active?: boolean; href?: string }) {
  const content = (
    <div className={cn('flex flex-col items-center gap-0.5', active ? 'text-orange-500' : 'text-gray-600')}>
      <span className="text-lg">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ===== Mock =====
const MOCK_ORDERS: Order[] = [
  {
    id: 'o1', orderNumber: 32, status: 'cooking', source: 'staff', total: 900000,
    createdAt: new Date(Date.now() - 2700000).toISOString(),
    table: { name: 'A01' }, staff: { name: 'Nguyễn Văn Nam' },
    items: [
      { menuItem: { name: 'Bò nướng tảng' }, quantity: 2, unitPrice: 250000 },
      { menuItem: { name: 'Mực nướng muối ớt' }, quantity: 1, unitPrice: 250000 },
      { menuItem: { name: 'Tiger Bạc' }, quantity: 6, unitPrice: 25000 },
    ],
  },
  {
    id: 'o2', orderNumber: 28, status: 'served', source: 'qr', total: 1270000,
    createdAt: new Date(Date.now() - 4800000).toISOString(),
    table: { name: 'A05' }, staff: undefined,
    items: [
      { menuItem: { name: 'Lẩu hải sản chua cay' }, quantity: 1, unitPrice: 450000 },
      { menuItem: { name: 'Bò nướng tảng' }, quantity: 2, unitPrice: 350000 },
      { menuItem: { name: 'Heineken' }, quantity: 4, unitPrice: 30000 },
    ],
  },
  {
    id: 'o3', orderNumber: 25, status: 'pending', source: 'staff', total: 284000,
    createdAt: new Date(Date.now() - 3300000).toISOString(),
    table: { name: 'B03' }, staff: { name: 'Lê Văn Tài' },
    items: [
      { menuItem: { name: 'Cánh gà chiên mắm' }, quantity: 1, unitPrice: 155000 },
      { menuItem: { name: 'Tiger Nâu' }, quantity: 2, unitPrice: 22000 },
      { menuItem: { name: 'Nem chua rán' }, quantity: 1, unitPrice: 85000 },
    ],
  },
  {
    id: 'o4', orderNumber: 20, status: 'paid', source: 'staff', total: 270000,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    table: { name: 'C01' }, staff: { name: 'Trần Thị Hoa' },
    items: [
      { menuItem: { name: 'Rau muống xào tỏi' }, quantity: 2, unitPrice: 45000 },
      { menuItem: { name: 'Bò lúc lắc' }, quantity: 1, unitPrice: 180000 },
    ],
  },
];
