'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSocket } from '@/hooks/use-socket';
import { formatVND, cn } from '@/lib/utils';
import { api } from '@/lib/api';

const STORE_ID = 'store-001';

interface TableInfo {
  id: string;
  name: string;
  status: 'empty' | 'occupied' | 'reserved' | 'paying';
  seats: number;
  floor: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  createdAt: string;
}

export default function StaffDashboardPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({ openTables: 0, orders: 0, revenue: 0, revenuePerHour: 0 });
  const [loading, setLoading] = useState(true);

  const { connected, on } = useSocket({ storeId: STORE_ID, role: 'staff' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsub1 = on('table:updated', () => loadData());
    const unsub2 = on('notification', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 10));
    });
    const unsub3 = on('order:created', () => loadData());
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [on]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const [tablesData, revenueData] = await Promise.all([
        api(`/tables?storeId=${STORE_ID}`, { token }),
        api(`/payments/revenue/${STORE_ID}`, { token }),
      ]);
      setTables(tablesData);
      const openTables = tablesData.filter((t: TableInfo) => t.status !== 'empty').length;
      setStats({
        openTables,
        orders: revenueData.orderCount || 0,
        revenue: revenueData.revenue || 0,
        revenuePerHour: Math.round((revenueData.revenue || 0) / Math.max(1, new Date().getHours() - 7)),
      });
    } catch {
      // Mock data
      setTables(MOCK_TABLES);
      setNotifications(MOCK_NOTIFICATIONS);
      setStats({ openTables: 12, orders: 32, revenue: 12450000, revenuePerHour: 2450000 });
    } finally {
      setLoading(false);
    }
  };

  const openTables = tables.filter((t) => t.status !== 'empty');

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-400 rounded-full flex items-center justify-center text-base">
            👤
          </div>
          <div>
            <span className="text-xs text-gray-500">Chào buổi sáng</span>
            <h2 className="text-[15px] font-semibold">
              Nguyễn Văn Nam
              <span className="ml-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                Phục vụ
              </span>
            </h2>
          </div>
        </div>
        <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-500' : 'bg-red-500')}></div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
        <Link href="/staff/tables" className="bg-dark-600 border border-dark-400 rounded-xl p-3 text-center">
          <div className="text-xl mb-1">🪑</div>
          <span className="text-[10px] text-gray-400">Quản lý bàn</span>
        </Link>
        <Link href="/staff/create-order" className="bg-dark-600 border border-dark-400 rounded-xl p-3 text-center">
          <div className="text-xl mb-1">📝</div>
          <span className="text-[10px] text-gray-400">Order mới</span>
        </Link>
        <Link href="/staff/notifications" className="bg-dark-600 border border-dark-400 rounded-xl p-3 text-center">
          <div className="text-xl mb-1">🛎️</div>
          <span className="text-[10px] text-gray-400">Dịch vụ</span>
        </Link>
        <Link href="/staff/payment" className="bg-dark-600 border border-dark-400 rounded-xl p-3 text-center">
          <div className="text-xl mb-1">💳</div>
          <span className="text-[10px] text-gray-400">Thanh toán</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Tổng quan ca làm</h3>
          <span className="text-xs text-gray-500 bg-dark-600 border border-dark-400 px-2 py-1 rounded">☀️ Ca sáng</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-dark-600 rounded-xl p-3 text-center">
            <div className="text-lg font-bold">{stats.openTables}</div>
            <div className="text-[10px] text-gray-500">Bàn mở</div>
          </div>
          <div className="bg-dark-600 rounded-xl p-3 text-center">
            <div className="text-lg font-bold">{stats.orders}</div>
            <div className="text-[10px] text-gray-500">Đơn hàng</div>
          </div>
          <div className="bg-dark-600 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-orange-500">{(stats.revenue / 1000000).toFixed(1)}M</div>
            <div className="text-[10px] text-gray-500">Doanh thu</div>
          </div>
          <div className="bg-dark-600 rounded-xl p-3 text-center">
            <div className="text-lg font-bold">{(stats.revenuePerHour / 1000000).toFixed(1)}M</div>
            <div className="text-[10px] text-gray-500">DT/giờ</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="px-4 pb-4">
        <h3 className="text-sm font-semibold mb-3">Thông báo mới</h3>
        <div className="space-y-2">
          {(notifications.length > 0 ? notifications : MOCK_NOTIFICATIONS).slice(0, 4).map((notif) => (
            <div key={notif.id} className="bg-dark-600 rounded-xl p-3 flex items-center gap-3 border-l-[3px] border-l-orange-500">
              <div className="w-8 h-8 bg-dark-500 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                {notif.type === 'payment_request' ? '💰' :
                 notif.type === 'order_new' ? '📦' :
                 notif.type === 'service_request' ? '🔔' : '✅'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 truncate">{notif.title}</p>
                {notif.body && <p className="text-[10px] text-gray-500 truncate">{notif.body}</p>}
              </div>
              <span className="text-[10px] text-gray-600 flex-shrink-0">
                {new Date(notif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table Map */}
      <div className="px-4 pb-4">
        <h3 className="text-sm font-semibold mb-3">Sơ đồ bàn</h3>
        <div className="flex gap-3 mb-3 flex-wrap">
          <Legend color="bg-green-500" label="Trống" />
          <Legend color="bg-orange-500" label="Đang mở" />
          <Legend color="bg-blue-500" label="Đã đặt" />
          <Legend color="bg-red-500" label="Yêu cầu TT" />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {tables.slice(0, 10).map((table) => (
            <div
              key={table.id}
              className={cn(
                'aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold border-2',
                table.status === 'empty' ? 'border-green-500 bg-green-500/10 text-green-500' :
                table.status === 'occupied' ? 'border-orange-500 bg-orange-500/10 text-orange-500' :
                table.status === 'reserved' ? 'border-blue-500 bg-blue-500/10 text-blue-500' :
                'border-red-500 bg-red-500/10 text-red-500 animate-pulse',
              )}
            >
              {table.name}
              {table.status !== 'empty' && (
                <span className="text-[9px] font-normal opacity-80 mt-0.5">
                  {table.seats}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 flex justify-around py-2.5 pb-3.5 border-t border-dark-400 z-50">
        <NavItem icon="🏠" label="Trang chủ" active />
        <NavItem icon="🪑" label="Bàn" href="/staff/tables" />
        <NavItem icon="📝" label="Order" href="/staff/create-order" />
        <NavItem icon="📊" label="Đơn hàng" href="/staff/orders" />
        <NavItem icon="👤" label="Tài khoản" href="/staff/account" />
      </nav>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-2 h-2 rounded-sm', color)}></div>
      <span className="text-[10px] text-gray-500">{label}</span>
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

// ===== Mock data =====
const MOCK_TABLES: TableInfo[] = [
  { id: '1', name: 'A01', status: 'occupied', seats: 4, floor: '1' },
  { id: '2', name: 'A02', status: 'occupied', seats: 2, floor: '1' },
  { id: '3', name: 'A03', status: 'empty', seats: 4, floor: '1' },
  { id: '4', name: 'A04', status: 'reserved', seats: 6, floor: '1' },
  { id: '5', name: 'A05', status: 'paying', seats: 8, floor: '1' },
  { id: '6', name: 'A06', status: 'empty', seats: 2, floor: '1' },
  { id: '7', name: 'A07', status: 'occupied', seats: 4, floor: '1' },
  { id: '8', name: 'A08', status: 'empty', seats: 6, floor: '1' },
  { id: '9', name: 'A09', status: 'occupied', seats: 4, floor: '1' },
  { id: '10', name: 'B01', status: 'empty', seats: 4, floor: '1' },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'payment_request', title: 'A05 yêu cầu thanh toán', body: 'Tổng 1.250.000đ', createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: 'n2', type: 'order_new', title: 'Đơn mới từ bàn A07', body: '5 món · QR Order', createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: 'n3', type: 'service_request', title: 'C02 gọi phục vụ', body: 'Thêm đá và ly', createdAt: new Date(Date.now() - 480000).toISOString() },
  { id: 'n4', type: 'order_ready', title: 'Bếp thông báo món sẵn sàng', body: 'C03 - Sườn nướng', createdAt: new Date(Date.now() - 720000).toISOString() },
];
