'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

const STORE_ID = 'store-001';

interface DailyData {
  date: string;
  revenue: number;
  orders: number;
}

interface TopItem {
  name: string;
  count: number;
  revenue: number;
}

interface StaffPerf {
  name: string;
  orders: number;
  revenue: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | '7days' | '30days'>('today');
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayAvg, setTodayAvg] = useState(0);
  const [revenueChange, setRevenueChange] = useState(0);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [staffPerf, setStaffPerf] = useState<StaffPerf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [period]);

  const token = () => localStorage.getItem('token') || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const days = period === 'today' ? 1 : period === '7days' ? 7 : 30;

      const [dashboard, daily, items, staff] = await Promise.all([
        api(`/reports/dashboard/${STORE_ID}`, { token: token() }),
        api(`/reports/revenue-by-day/${STORE_ID}?days=${days}`, { token: token() }),
        api(`/reports/top-items/${STORE_ID}`, { token: token() }),
        api(`/reports/staff/${STORE_ID}`, { token: token() }),
      ]);

      setTodayRevenue(dashboard.today.totalRevenue);
      setTodayOrders(dashboard.today.orderCount);
      setTodayAvg(dashboard.today.avgPerOrder);
      setRevenueChange(dashboard.revenueChange);
      setDailyData(daily);
      setTopItems(items);
      setStaffPerf(staff);
    } catch {
      // Mock
      setTodayRevenue(18500000);
      setTodayOrders(45);
      setTodayAvg(411000);
      setRevenueChange(12);
      setDailyData(MOCK_DAILY);
      setTopItems(MOCK_ITEMS);
      setStaffPerf(MOCK_STAFF);
    }
    setLoading(false);
  };

  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue), 1);

  return (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff/account" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Báo cáo doanh thu</h1>
        </div>
      </header>

      {/* Period Selector */}
      <div className="flex gap-2 px-4 py-3">
        {([
          { key: 'today', label: 'Hôm nay' },
          { key: '7days', label: '7 ngày' },
          { key: '30days', label: '30 ngày' },
        ] as const).map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-medium border transition-all',
              period === p.key
                ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                : 'border-dark-400 text-gray-500',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2.5 px-4 mb-4">
        <div className="bg-dark-600 rounded-xl p-4 border border-dark-400">
          <p className="text-[10px] text-gray-500 mb-1">Doanh thu</p>
          <p className="text-xl font-bold text-orange-500">{formatVND(todayRevenue)}</p>
          <p className={cn('text-[10px] mt-1', revenueChange >= 0 ? 'text-green-500' : 'text-red-500')}>
            {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange)}% so với hôm qua
          </p>
        </div>
        <div className="bg-dark-600 rounded-xl p-4 border border-dark-400">
          <p className="text-[10px] text-gray-500 mb-1">Số đơn</p>
          <p className="text-xl font-bold text-green-500">{todayOrders}</p>
          <p className="text-[10px] text-gray-500 mt-1">TB: {formatVND(todayAvg)}/đơn</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="mx-4 mb-4 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <h3 className="text-sm font-semibold mb-3">📈 Biểu đồ doanh thu</h3>
        <div className="flex items-end gap-1 h-32">
          {dailyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] text-gray-500">
                {d.revenue > 0 ? `${(d.revenue / 1000000).toFixed(1)}M` : ''}
              </span>
              <div
                className="w-full rounded-t bg-orange-500/80 transition-all duration-500"
                style={{ height: `${(d.revenue / maxRevenue) * 80}px`, minHeight: d.revenue > 0 ? '4px' : '0' }}
              ></div>
              <span className="text-[8px] text-gray-600">
                {period === 'today' ? `${d.date}h` : d.date.split('-').pop()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Items */}
      <div className="mx-4 mb-4 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <h3 className="text-sm font-semibold mb-3">🏆 Top món bán chạy</h3>
        <div className="space-y-2">
          {topItems.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className={cn(
                'w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center',
                i < 3 ? 'bg-orange-500 text-white' : 'bg-dark-500 text-gray-400',
              )}>
                {i + 1}
              </span>
              <span className="flex-1 text-gray-300 truncate">{item.name}</span>
              <span className="text-gray-500">{item.count} phần</span>
              <span className="text-orange-500 font-semibold w-16 text-right">{formatVND(item.revenue)}</span>
            </div>
          ))}
          {topItems.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Chưa có dữ liệu</p>}
        </div>
      </div>

      {/* Staff Performance */}
      <div className="mx-4 mb-4 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <h3 className="text-sm font-semibold mb-3">👥 Hiệu suất nhân viên</h3>
        <div className="space-y-2">
          {staffPerf.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {s.name[0]}
              </div>
              <span className="flex-1 text-gray-300">{s.name}</span>
              <span className="text-gray-500">{s.orders} đơn</span>
              <span className="text-green-500 font-semibold w-16 text-right">{formatVND(s.revenue)}</span>
            </div>
          ))}
          {staffPerf.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Chưa có dữ liệu</p>}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mx-4 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <h3 className="text-sm font-semibold mb-3">💳 Phương thức thanh toán</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-dark-500 rounded-lg p-3 text-center">
            <div className="text-lg mb-1">💵</div>
            <div className="text-xs text-gray-400">Tiền mặt</div>
            <div className="text-sm font-bold text-white mt-1">65%</div>
          </div>
          <div className="bg-dark-500 rounded-lg p-3 text-center">
            <div className="text-lg mb-1">📱</div>
            <div className="text-xs text-gray-400">QR</div>
            <div className="text-sm font-bold text-white mt-1">30%</div>
          </div>
          <div className="bg-dark-500 rounded-lg p-3 text-center">
            <div className="text-lg mb-1">💳</div>
            <div className="text-xs text-gray-400">Thẻ</div>
            <div className="text-sm font-bold text-white mt-1">5%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock data
const MOCK_DAILY: DailyData[] = [
  { date: '2026-06-15', revenue: 5200000, orders: 12 },
  { date: '2026-06-16', revenue: 8900000, orders: 22 },
  { date: '2026-06-17', revenue: 12100000, orders: 30 },
  { date: '2026-06-18', revenue: 15800000, orders: 38 },
  { date: '2026-06-19', revenue: 9600000, orders: 25 },
  { date: '2026-06-20', revenue: 18200000, orders: 44 },
  { date: '2026-06-21', revenue: 18500000, orders: 45 },
];
const MOCK_ITEMS: TopItem[] = [
  { name: 'Tiger Bạc', count: 48, revenue: 1200000 },
  { name: 'Bò nướng tảng', count: 22, revenue: 5500000 },
  { name: 'Mực nướng muối ớt', count: 18, revenue: 4500000 },
  { name: 'Cánh gà chiên mắm', count: 15, revenue: 2325000 },
  { name: 'Lẩu hải sản', count: 12, revenue: 5400000 },
];
const MOCK_STAFF: StaffPerf[] = [
  { name: 'Nguyễn Văn Nam', orders: 12, revenue: 5200000 },
  { name: 'Trần Thị Hoa', orders: 10, revenue: 4800000 },
  { name: 'Lê Văn Tài', orders: 8, revenue: 3600000 },
];
