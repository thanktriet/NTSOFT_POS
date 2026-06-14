'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { api } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

const STORE_ID = 'store-001';

interface LiveEvent {
  id: string;
  text: string;
  type: 'payment' | 'order' | 'table' | 'kitchen';
  time: string;
}

interface TopItem {
  name: string;
  count: number;
  revenue: number;
}

interface StaffPerf {
  name: string;
  initial: string;
  orders: number;
  revenue: number;
}

export default function AdminDashboardPage() {
  const [revenue, setRevenue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [avgPerOrder, setAvgPerOrder] = useState(0);
  const [openTables, setOpenTables] = useState(0);
  const [totalTables, setTotalTables] = useState(20);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>(MOCK_EVENTS);
  const [topItems, setTopItems] = useState<TopItem[]>(MOCK_TOP_ITEMS);
  const [staffPerf, setStaffPerf] = useState<StaffPerf[]>(MOCK_STAFF);
  const [tableStats, setTableStats] = useState({ empty: 7, occupied: 10, reserved: 2, paying: 1 });

  const { connected, on } = useSocket({ storeId: STORE_ID, role: 'owner' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsub1 = on('order:created', (data: any) => {
      addLiveEvent(`${data.table?.name || 'Bàn'} đặt ${data.items?.length || 0} món`, 'order');
      loadData();
    });
    const unsub2 = on('table:updated', () => loadData());
    const unsub3 = on('notification', (data: any) => {
      if (data.type === 'payment_request') {
        addLiveEvent(`${data.title}`, 'payment');
      }
    });
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [on]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const [revenueData, tablesData] = await Promise.all([
        api(`/payments/revenue/${STORE_ID}`, { token }),
        api(`/tables?storeId=${STORE_ID}`, { token }),
      ]);
      setRevenue(revenueData.revenue || 0);
      setOrderCount(revenueData.orderCount || 0);
      setAvgPerOrder(revenueData.avgPerOrder || 0);
      setTotalTables(tablesData.length);
      setOpenTables(tablesData.filter((t: any) => t.status !== 'empty').length);
      setTableStats({
        empty: tablesData.filter((t: any) => t.status === 'empty').length,
        occupied: tablesData.filter((t: any) => t.status === 'occupied').length,
        reserved: tablesData.filter((t: any) => t.status === 'reserved').length,
        paying: tablesData.filter((t: any) => t.status === 'paying').length,
      });
    } catch {
      // Use mock data
      setRevenue(18500000);
      setOrderCount(45);
      setAvgPerOrder(411000);
      setOpenTables(12);
    }
  };

  const addLiveEvent = (text: string, type: LiveEvent['type']) => {
    setLiveEvents((prev) => [
      { id: Date.now().toString(), text, type, time: '1p' },
      ...prev.slice(0, 9),
    ]);
  };

  const revenueChange = 12; // % vs yesterday (mock)

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="bg-dark-700 px-6 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-400 rounded-lg flex items-center justify-center text-xs font-extrabold">
            NT
          </div>
          <div>
            <h1 className="text-base font-bold">Dashboard</h1>
            <span className="text-xs text-gray-500">Nam Thắng Beer & Food</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {new Date().toLocaleDateString('vi-VN')} · Ca sáng
          </span>
          <span className={cn(
            'text-[9px] font-bold px-2 py-0.5 rounded-full',
            connected ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-600 text-gray-400',
          )}>
            ● {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </header>

      <div className="p-5 max-w-[1200px] mx-auto">
        {/* Revenue Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <RevenueCard
            icon="💰" label="Doanh thu hôm nay"
            value={`${(revenue / 1000000).toFixed(1)}M`}
            change={`↑ ${revenueChange}% so với hôm qua`}
            changeType="up"
            color="text-orange-500"
          />
          <RevenueCard
            icon="🧾" label="Tổng đơn hàng"
            value={orderCount.toString()}
            change="↑ 8 đơn so với hôm qua"
            changeType="up"
            color="text-green-500"
          />
          <RevenueCard
            icon="💵" label="TB mỗi đơn"
            value={`${Math.round(avgPerOrder / 1000)}K`}
            change="↑ 5% so với tuần trước"
            changeType="up"
            color="text-blue-500"
          />
          <RevenueCard
            icon="🪑" label="Bàn đang mở"
            value={`${openTables}/${totalTables}`}
            change={`${Math.round((openTables / totalTables) * 100)}% công suất`}
            changeType="neutral"
            color="text-purple-500"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-dark-700 rounded-2xl p-5 border border-dark-400">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold">📈 Doanh thu theo giờ</h3>
              <div className="flex gap-1">
                <span className="px-2 py-1 bg-orange-500 rounded text-[10px] text-white">Hôm nay</span>
                <span className="px-2 py-1 bg-dark-500 border border-dark-400 rounded text-[10px] text-gray-500">7 ngày</span>
              </div>
            </div>
            <div className="h-40 bg-dark-800 rounded-lg flex items-end px-4 pb-6 pt-4 gap-2 justify-between">
              {MOCK_HOURLY.map((h) => (
                <div key={h.hour} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[9px] text-gray-500">{h.value > 0 ? `${h.value}` : ''}</span>
                  <div
                    className="w-full max-w-[24px] rounded-t bg-orange-500 opacity-80 transition-all"
                    style={{ height: `${(h.value / 45) * 100}%`, minHeight: h.value > 0 ? '4px' : '0' }}
                  ></div>
                  <span className="text-[9px] text-gray-600">{h.hour}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity */}
          <div className="bg-dark-700 rounded-2xl p-5 border border-dark-400 flex flex-col">
            <h3 className="text-sm font-semibold mb-3">⚡ Hoạt động realtime</h3>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-52">
              {liveEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 p-2 bg-dark-800 rounded-lg text-[11px]">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    ev.type === 'payment' ? 'bg-green-500' :
                    ev.type === 'order' ? 'bg-orange-500' :
                    ev.type === 'kitchen' ? 'bg-blue-500' : 'bg-purple-500',
                  )}></span>
                  <span className="text-gray-300 flex-1 truncate">{ev.text}</span>
                  <span className="text-gray-600 text-[10px] flex-shrink-0">{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Table Status */}
          <div className="bg-dark-700 rounded-2xl p-5 border border-dark-400">
            <h3 className="text-sm font-semibold mb-4">🪑 Trạng thái bàn</h3>
            <div className="flex items-center justify-center gap-6">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#1e2028" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="4"
                    strokeDasharray={`${(tableStats.empty / totalTables) * 88} 88`} strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f97316" strokeWidth="4"
                    strokeDasharray={`${(tableStats.occupied / totalTables) * 88} 88`}
                    strokeDashoffset={`-${(tableStats.empty / totalTables) * 88}`} />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4"
                    strokeDasharray={`${(tableStats.reserved / totalTables) * 88} 88`}
                    strokeDashoffset={`-${((tableStats.empty + tableStats.occupied) / totalTables) * 88}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{totalTables}</span>
                  <span className="text-[8px] text-gray-500">tổng bàn</span>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-green-500"></div> Trống ({tableStats.empty})</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-orange-500"></div> Đang mở ({tableStats.occupied})</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> Đã đặt ({tableStats.reserved})</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-red-500"></div> Yêu cầu TT ({tableStats.paying})</div>
              </div>
            </div>
          </div>

          {/* Top Items */}
          <div className="bg-dark-700 rounded-2xl p-5 border border-dark-400">
            <h3 className="text-sm font-semibold mb-3">🏆 Top món bán chạy</h3>
            <div className="space-y-2">
              {topItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className={cn(
                    'w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center',
                    i === 0 ? 'bg-orange-500 text-white' :
                    i === 1 ? 'bg-orange-400 text-white' :
                    i === 2 ? 'bg-orange-300 text-dark-900' : 'bg-dark-500 text-gray-400',
                  )}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-gray-300">{item.name}</span>
                  <span className="text-gray-500">{item.count}</span>
                  <span className="text-orange-500 font-semibold w-16 text-right">{formatVND(item.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Staff Performance */}
          <div className="bg-dark-700 rounded-2xl p-5 border border-dark-400">
            <h3 className="text-sm font-semibold mb-3">👥 Hiệu suất nhân viên</h3>
            <div className="space-y-2.5">
              {staffPerf.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold">
                    {s.initial}
                  </div>
                  <span className="flex-1 text-gray-300">{s.name}</span>
                  <span className="text-gray-500">{s.orders} đơn</span>
                  <span className="text-green-500 font-semibold w-14 text-right">
                    {(s.revenue / 1000000).toFixed(1)}M
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueCard({ icon, label, value, change, changeType, color }: {
  icon: string; label: string; value: string; change: string; changeType: 'up' | 'down' | 'neutral'; color: string;
}) {
  return (
    <div className="bg-dark-700 rounded-2xl p-4 border border-dark-400">
      <div className="text-[11px] text-gray-500 mb-1.5 flex items-center gap-1">{icon} {label}</div>
      <div className={cn('text-2xl font-extrabold', color)}>{value}</div>
      <div className={cn('text-[11px] mt-1',
        changeType === 'up' ? 'text-green-500' :
        changeType === 'down' ? 'text-red-500' : 'text-gray-500',
      )}>
        {change}
      </div>
    </div>
  );
}

// ===== Mock data =====
const MOCK_HOURLY = [
  { hour: 8, value: 5 }, { hour: 9, value: 10 }, { hour: 10, value: 18 },
  { hour: 11, value: 35 }, { hour: 12, value: 45 }, { hour: 13, value: 38 },
  { hour: 14, value: 22 }, { hour: 15, value: 12 }, { hour: 16, value: 6 },
];

const MOCK_EVENTS: LiveEvent[] = [
  { id: '1', text: 'A07 thanh toán 680K (QR)', type: 'payment', time: '1p' },
  { id: '2', text: 'B03 đặt thêm 3 món', type: 'order', time: '2p' },
  { id: '3', text: 'A05 yêu cầu thanh toán', type: 'payment', time: '3p' },
  { id: '4', text: 'Bàn C01 mở mới (4 khách)', type: 'table', time: '5p' },
  { id: '5', text: 'Bếp hoàn thành đơn A03', type: 'kitchen', time: '6p' },
  { id: '6', text: 'B05 QR order 5 món mới', type: 'order', time: '8p' },
  { id: '7', text: 'A02 thanh toán 420K (mặt)', type: 'payment', time: '10p' },
];

const MOCK_TOP_ITEMS: TopItem[] = [
  { name: 'Tiger Bạc', count: 48, revenue: 1200000 },
  { name: 'Bò nướng tảng', count: 22, revenue: 5500000 },
  { name: 'Mực nướng muối ớt', count: 18, revenue: 4500000 },
  { name: 'Cánh gà chiên mắm', count: 15, revenue: 2325000 },
  { name: 'Lẩu hải sản', count: 12, revenue: 5400000 },
];

const MOCK_STAFF: StaffPerf[] = [
  { name: 'Nguyễn Văn Nam', initial: 'N', orders: 12, revenue: 5200000 },
  { name: 'Trần Thị Hoa', initial: 'H', orders: 10, revenue: 4800000 },
  { name: 'Lê Văn Tài', initial: 'T', orders: 8, revenue: 3600000 },
  { name: 'Phạm Văn Hòa', initial: 'P', orders: 7, revenue: 2900000 },
];
