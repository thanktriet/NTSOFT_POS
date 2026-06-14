'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSocket } from '@/hooks/use-socket';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STORE_ID = 'store-001';

interface Notification {
  id: string;
  type: 'order_new' | 'order_ready' | 'payment_request' | 'service_request' | 'system';
  title: string;
  body?: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG = {
  order_new: { icon: '📦', color: 'border-l-orange-500', iconBg: 'bg-orange-500/15' },
  order_ready: { icon: '✅', color: 'border-l-green-500', iconBg: 'bg-green-500/15' },
  payment_request: { icon: '💰', color: 'border-l-red-500', iconBg: 'bg-red-500/15' },
  service_request: { icon: '🛎️', color: 'border-l-blue-500', iconBg: 'bg-blue-500/15' },
  system: { icon: '⚙️', color: 'border-l-gray-500', iconBg: 'bg-gray-500/15' },
};

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const { on } = useSocket({ storeId: STORE_ID, role: 'staff' });

  useEffect(() => { loadNotifications(); }, []);

  useEffect(() => {
    const unsub = on('notification', (notif: Notification) => {
      setNotifications((prev) => [{ ...notif, isRead: false }, ...prev]);
    });
    const unsub2 = on('service:request', (data: any) => {
      const notif: Notification = {
        id: Date.now().toString(),
        type: 'service_request',
        title: `${data.tableId} yêu cầu`,
        body: data.message || data.type,
        data,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
    });
    return () => { unsub?.(); unsub2?.(); };
  }, [on]);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const data = await api(`/notifications/${STORE_ID}`, { token });
      setNotifications(data);
    } catch {
      setNotifications(MOCK_NOTIFS);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try {
      const token = localStorage.getItem('token') || '';
      await api(`/notifications/${id}/read`, { method: 'PUT', token });
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const token = localStorage.getItem('token') || '';
      await api(`/notifications/${STORE_ID}/read-all`, { method: 'PUT', token });
    } catch {}
  };

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'payment_request', label: '🔴 Thanh toán' },
    { key: 'order_new', label: '🟠 Đơn mới' },
    { key: 'service_request', label: '🔵 Yêu cầu' },
    { key: 'order_ready', label: '🟢 Bếp' },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Thông báo</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-orange-500">
            Đánh dấu đã đọc
          </button>
        )}
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

      {/* Notification List */}
      <div className="px-4 space-y-2">
        {filtered.map((notif) => {
          const config = TYPE_CONFIG[notif.type];
          return (
            <button
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={cn(
                'w-full text-left bg-dark-600 rounded-xl p-3.5 flex gap-3 border border-dark-400 transition-all',
                !notif.isRead && `border-l-[3px] ${config.color} bg-dark-600/80`,
              )}
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0', config.iconBg)}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-[13px] truncate', !notif.isRead ? 'font-semibold text-white' : 'text-gray-300')}>
                  {notif.title}
                </p>
                {notif.body && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{notif.body}</p>
                )}
                <p className="text-[10px] text-gray-600 mt-1">
                  {timeAgo(notif.createdAt)}
                </p>
              </div>
              {!notif.isRead && (
                <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1.5"></div>
              )}
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <span className="text-3xl">🔔</span>
            <p className="text-sm text-gray-500 mt-2">Không có thông báo</p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 flex justify-around py-2.5 pb-3.5 border-t border-dark-400 z-50">
        <NavItem icon="🏠" label="Trang chủ" href="/staff" />
        <NavItem icon="🪑" label="Bàn" href="/staff/tables" />
        <NavItem icon="📝" label="Order" href="/staff/create-order" />
        <NavItem icon="📊" label="Đơn hàng" href="/staff/orders" />
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

// ===== Mock =====
const MOCK_NOTIFS: Notification[] = [
  { id: 'n1', type: 'payment_request', title: 'A05 yêu cầu thanh toán', body: 'Tổng 1.250.000đ · 8 khách · 1h20p', data: {}, isRead: false, createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: 'n2', type: 'order_new', title: 'Đơn mới từ bàn A07', body: '5 món · Khách tự order qua QR', data: {}, isRead: false, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: 'n3', type: 'service_request', title: 'C02 gọi phục vụ', body: 'Yêu cầu thêm đá và ly', data: {}, isRead: false, createdAt: new Date(Date.now() - 480000).toISOString() },
  { id: 'n4', type: 'service_request', title: 'B03 yêu cầu thêm đồ', body: 'Thêm giấy / Khăn ướt', data: {}, isRead: false, createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: 'n5', type: 'order_ready', title: 'Bếp thông báo món sẵn sàng', body: 'C03 - Sườn nướng (2), Cơm chiên bò (1)', data: {}, isRead: true, createdAt: new Date(Date.now() - 720000).toISOString() },
  { id: 'n6', type: 'order_ready', title: 'Bếp thông báo món sẵn sàng', body: 'A05 - Lẩu bò nhúng dấm (1), Lẩu hải sản (1)', data: {}, isRead: true, createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: 'n7', type: 'order_new', title: 'Đơn mới từ bàn B03', body: '3 món · NV Trần Thị Hoa tạo', data: {}, isRead: true, createdAt: new Date(Date.now() - 1200000).toISOString() },
  { id: 'n8', type: 'system', title: 'Báo cáo ca tối', body: 'Doanh thu: 18.500.000đ · 45 đơn', data: {}, isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
];
