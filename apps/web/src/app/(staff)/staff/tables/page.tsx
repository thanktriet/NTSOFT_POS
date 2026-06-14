'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

const STORE_ID = 'store-001';

type TableStatus = 'empty' | 'occupied' | 'reserved' | 'paying';

interface Table {
  id: string;
  name: string;
  status: TableStatus;
  seats: number;
  floor: string;
}

const STATUS_CONFIG: Record<TableStatus, { label: string; border: string; bg: string; text: string }> = {
  empty: { label: 'Trống', border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-500' },
  occupied: { label: 'Đang mở', border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  reserved: { label: 'Đã đặt', border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-500' },
  paying: { label: 'Yêu cầu TT', border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-500' },
};

export default function StaffTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [floor, setFloor] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTables(); }, []);

  const loadTables = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const data = await api(`/tables?storeId=${STORE_ID}`, { token });
      setTables(data);
    } catch {
      setTables(MOCK_TABLES);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tables
    .filter((t) => filter === 'all' || t.status === filter)
    .filter((t) => floor === 'all' || t.floor === floor);

  const counts = {
    all: tables.length,
    empty: tables.filter((t) => t.status === 'empty').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    paying: tables.filter((t) => t.status === 'paying').length,
  };

  const floors = [...new Set(tables.map((t) => t.floor))].sort();

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Quản lý bàn</h1>
        </div>
        <button className="bg-orange-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold">
          + Thêm bàn
        </button>
      </header>

      {/* Status Filters */}
      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
        {(['all', 'empty', 'occupied', 'reserved', 'paying'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border',
              filter === key
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-dark-600 border-dark-400 text-gray-400',
            )}
          >
            {key === 'all' ? 'Tất cả' : STATUS_CONFIG[key].label}
            <span className="ml-1 opacity-70">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Floor Tabs */}
      {floors.length > 1 && (
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setFloor('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs border',
              floor === 'all' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-dark-400 text-gray-500 bg-dark-600',
            )}
          >
            Tất cả
          </button>
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => setFloor(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs border',
                floor === f ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-dark-400 text-gray-500 bg-dark-600',
              )}
            >
              Tầng {f}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 px-4 pb-3 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-sm', val.border.replace('border', 'bg'))}></div>
            <span className="text-[10px] text-gray-500">{val.label}</span>
          </div>
        ))}
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-3 gap-2.5 px-4 pb-4">
        {filtered.map((table) => {
          const config = STATUS_CONFIG[table.status];
          return (
            <button
              key={table.id}
              className={cn(
                'border-2 rounded-xl p-3 text-center transition-all active:scale-95',
                config.border, config.bg,
                table.status === 'paying' && 'animate-pulse',
              )}
            >
              <div className={cn('text-base font-bold', config.text)}>{table.name}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{config.label}</div>
              {table.status === 'empty' ? (
                <div className="text-[10px] text-gray-600 mt-1">🪑 {table.seats} chỗ</div>
              ) : (
                <div className="text-[10px] text-gray-500 mt-1">👥 {table.seats} khách</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[390px] mx-auto px-4 pb-2">
        <div className="flex gap-2">
          <button className="flex-1 py-3 bg-green-500 text-white rounded-lg text-xs font-semibold">
            🪑 Mở bàn
          </button>
          <button className="flex-1 py-3 bg-blue-500 text-white rounded-lg text-xs font-semibold">
            🔗 Gộp bàn
          </button>
          <button className="flex-1 py-3 bg-purple-500 text-white rounded-lg text-xs font-semibold">
            ↔ Chuyển bàn
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 flex justify-around py-2.5 pb-3.5 border-t border-dark-400 z-50">
        <NavItem icon="🏠" label="Trang chủ" href="/staff" />
        <NavItem icon="🪑" label="Bàn" active />
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

// ===== Mock =====
const MOCK_TABLES: Table[] = [
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
  { id: '11', name: 'B02', status: 'occupied', seats: 4, floor: '1' },
  { id: '12', name: 'B03', status: 'occupied', seats: 2, floor: '1' },
  { id: '13', name: 'C01', status: 'empty', seats: 4, floor: '2' },
  { id: '14', name: 'C02', status: 'occupied', seats: 2, floor: '2' },
  { id: '15', name: 'C03', status: 'empty', seats: 4, floor: '2' },
];
