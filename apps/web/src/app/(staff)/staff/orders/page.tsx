'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { api } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

const STORE_ID = 'store-001';

type OrderStatus = 'pending' | 'confirmed' | 'cooking' | 'served' | 'paid' | 'cancelled';

interface OrderItem {
  id: string;
  menuItem: { id: string; name: string };
  quantity: number;
  unitPrice: number;
  status: string;
  note?: string;
}

interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  source: 'qr' | 'staff';
  total: number;
  subtotal: number;
  discount: number;
  createdAt: string;
  table: { id: string; name: string };
  staff?: { name: string };
  items: OrderItem[];
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
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [billPreview, setBillPreview] = useState<Order | null>(null);
  const [message, setMessage] = useState('');

  const { on } = useSocket({ storeId: STORE_ID, role: 'staff' });

  useEffect(() => { loadOrders(); }, []);

  useEffect(() => {
    const unsub1 = on('order:created', () => loadOrders());
    const unsub2 = on('order:updated', () => loadOrders());
    const unsub3 = on('item:status', () => loadOrders());
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [on]);

  const token = () => localStorage.getItem('token') || '';

  const loadOrders = async () => {
    try {
      const data = await api(`/orders/store/${STORE_ID}`, { token: token() });
      setOrders(data);
    } catch {
      setMessage('Lỗi tải đơn hàng');
    }
    setLoading(false);
  };

  // ===== Actions =====

  const confirmOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await api(`/orders/${orderId}/status`, { method: 'PUT', token: token(), body: { status: 'confirmed' } });
      setMessage('✅ Đã xác nhận đơn');
      loadOrders();
    } catch { setMessage('❌ Lỗi xác nhận'); }
    setActionLoading(null);
  };

  const markServed = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await api(`/orders/${orderId}/status`, { method: 'PUT', token: token(), body: { status: 'served' } });
      setMessage('✅ Đã phục vụ');
      loadOrders();
    } catch { setMessage('❌ Lỗi'); }
    setActionLoading(null);
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Xác nhận hủy đơn?')) return;
    setActionLoading(orderId);
    try {
      await api(`/orders/${orderId}/status`, { method: 'PUT', token: token(), body: { status: 'cancelled' } });
      setMessage('✅ Đã hủy đơn');
      loadOrders();
    } catch { setMessage('❌ Lỗi'); }
    setActionLoading(null);
  };

  const printBillPreview = async (order: Order) => {
    try {
      const data = await api(`/print/receipt/${order.id}/text`, { token: token() });
      // Open print preview
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head><title>Bill ${order.table.name}</title><style>body{font-family:monospace;font-size:12px;white-space:pre-wrap;padding:20px;max-width:300px;margin:0 auto}@media print{body{padding:0}}</style></head><body>${data.text}\n\n<button onclick="window.print()" style="margin-top:20px;padding:8px 16px">🖨️ In</button></body></html>`);
        win.document.close();
      }
    } catch {
      setMessage('❌ Lỗi tạo bill');
    }
  };

  const goToPayment = (order: Order) => {
    localStorage.setItem('payment_order', JSON.stringify(order));
    router.push('/staff/payment');
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const filters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xác nhận' },
    { key: 'cooking', label: 'Đang chế biến' },
    { key: 'served', label: 'Đã phục vụ' },
    { key: 'paid', label: 'Đã TT' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center gap-3 border-b border-dark-400">
        <Link href="/staff" className="text-xl">←</Link>
        <h1 className="text-base font-semibold">Đơn hàng</h1>
        <span className="text-xs text-gray-500 ml-auto">{orders.length} đơn</span>
      </header>

      {/* Message */}
      {message && (
        <div className="mx-4 mt-3 p-2.5 bg-dark-700 border border-dark-400 rounded-lg text-xs text-center animate-fadeIn">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-gray-600">✕</button>
        </div>
      )}

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
            {f.key !== 'all' && (
              <span className="ml-1 opacity-70">
                {orders.filter((o) => o.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="px-4 space-y-3 pb-4 stagger-children">
        {filtered.map((order) => {
          const statusInfo = STATUS_MAP[order.status];
          const isLoading = actionLoading === order.id;

          return (
            <div key={order.id} className={cn('bg-dark-600 rounded-xl p-4 border border-dark-400', isLoading && 'opacity-50')}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                    {order.table.name}
                  </span>
                  <span className="text-[11px] text-gray-500">#{order.orderNumber.toString().padStart(4, '0')}</span>
                  <span className="text-[10px] text-gray-600">{order.source === 'qr' ? '📱QR' : '👤NV'}</span>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusInfo.class)}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1 mb-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-300">
                    <span>
                      <span className="text-orange-500 font-semibold">{item.quantity}x</span> {item.menuItem.name}
                      {item.note && <span className="text-yellow-500 ml-1">📝</span>}
                    </span>
                    <span className="text-gray-500">{formatVND(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-dark-400">
                <div className="text-[11px] text-gray-500">
                  {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  {order.staff && ` · ${order.staff.name}`}
                </div>
                <span className="text-base font-bold text-orange-500">{formatVND(order.total)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                {/* Pending → Confirm */}
                {order.status === 'pending' && (
                  <>
                    <button onClick={() => confirmOrder(order.id)} disabled={isLoading} className="flex-1 py-2 bg-green-500 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50">
                      ✓ Xác nhận
                    </button>
                    <button onClick={() => cancelOrder(order.id)} disabled={isLoading} className="py-2 px-3 bg-red-500/10 border border-red-500/30 rounded-lg text-[11px] font-semibold text-red-400 disabled:opacity-50">
                      Hủy
                    </button>
                  </>
                )}

                {/* Confirmed/Cooking → Print bill + Payment */}
                {(order.status === 'confirmed' || order.status === 'cooking') && (
                  <>
                    <button onClick={() => printBillPreview(order)} className="flex-1 py-2 bg-dark-500 rounded-lg text-[11px] font-semibold text-gray-300">
                      🖨️ In bill tạm
                    </button>
                    <button onClick={() => markServed(order.id)} disabled={isLoading} className="flex-1 py-2 bg-blue-500 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50">
                      🍽️ Đã phục vụ
                    </button>
                  </>
                )}

                {/* Served → Print + Pay */}
                {order.status === 'served' && (
                  <>
                    <button onClick={() => printBillPreview(order)} className="flex-1 py-2 bg-dark-500 rounded-lg text-[11px] font-semibold text-gray-300">
                      🖨️ In bill tạm
                    </button>
                    <button onClick={() => goToPayment(order)} className="flex-1 py-2 bg-green-500 rounded-lg text-[11px] font-semibold text-white">
                      💰 Thanh toán
                    </button>
                  </>
                )}

                {/* All active orders: add items */}
                {!['paid', 'cancelled'].includes(order.status) && (
                  <Link
                    href={`/staff/add-items?orderId=${order.id}&table=${order.table.name}`}
                    className="py-2 px-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-[11px] font-semibold text-orange-400 text-center"
                  >
                    + Thêm
                  </Link>
                )}
              </div>
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
