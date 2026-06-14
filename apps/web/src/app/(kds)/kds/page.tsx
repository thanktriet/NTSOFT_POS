'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { cn, formatVND } from '@/lib/utils';
import { api } from '@/lib/api';

interface KitchenItem {
  id: string;
  menuItem: { name: string; prepTime?: number };
  order: { table: { name: string }; staff?: { name: string }; orderNumber: number };
  quantity: number;
  note?: string;
  status: 'pending' | 'cooking' | 'ready' | 'served';
  assignedTo?: { id: string; name: string };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface KitchenQueue {
  pending: KitchenItem[];
  cooking: KitchenItem[];
  ready: KitchenItem[];
}

interface KitchenStats {
  total: number;
  completed: number;
  pending: number;
  cooking: number;
  avgTime: number;
}

// TODO: replace with actual storeId from auth
const STORE_ID = 'store-001';

export default function KdsPage() {
  const [queue, setQueue] = useState<KitchenQueue>({ pending: [], cooking: [], ready: [] });
  const [stats, setStats] = useState<KitchenStats>({ total: 0, completed: 0, pending: 0, cooking: 0, avgTime: 0 });
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { connected, on } = useSocket({ storeId: STORE_ID, role: 'kitchen' });

  // Load data
  const loadQueue = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const [queueData, statsData] = await Promise.all([
        api(`/kitchen/queue/${STORE_ID}`, { token }),
        api(`/kitchen/stats/${STORE_ID}`, { token }),
      ]);
      setQueue(queueData);
      setStats(statsData);
    } catch (err) {
      // Use mock data for preview
      setQueue(MOCK_QUEUE);
      setStats({ total: 32, completed: 21, pending: 7, cooking: 4, avgTime: 10 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Listen for realtime updates
  useEffect(() => {
    const unsub1 = on('order:created', () => {
      loadQueue();
      if (soundEnabled) playSound();
    });
    const unsub2 = on('item:status', () => loadQueue());
    return () => { unsub1?.(); unsub2?.(); };
  }, [on, loadQueue, soundEnabled]);

  // Actions
  const startCooking = async (itemId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      await api(`/kitchen/item/${itemId}/start`, { method: 'PUT', token, body: {} });
      loadQueue();
    } catch (err) {
      // Optimistic update for preview
      setQueue((prev) => {
        const item = prev.pending.find((i) => i.id === itemId);
        if (!item) return prev;
        return {
          pending: prev.pending.filter((i) => i.id !== itemId),
          cooking: [...prev.cooking, { ...item, status: 'cooking' }],
          ready: prev.ready,
        };
      });
    }
  };

  const markReady = async (itemId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      await api(`/kitchen/item/${itemId}/ready`, { method: 'PUT', token });
      loadQueue();
    } catch (err) {
      setQueue((prev) => {
        const item = prev.cooking.find((i) => i.id === itemId);
        if (!item) return prev;
        return {
          pending: prev.pending,
          cooking: prev.cooking.filter((i) => i.id !== itemId),
          ready: [...prev.ready, { ...item, status: 'ready' }],
        };
      });
    }
  };

  const markServed = async (itemId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      await api(`/kitchen/item/${itemId}/served`, { method: 'PUT', token });
      loadQueue();
    } catch (err) {
      setQueue((prev) => ({
        ...prev,
        ready: prev.ready.filter((i) => i.id !== itemId),
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Đang tải bếp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-dark-700 px-5 py-3 flex items-center justify-between border-b border-dark-400 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-dark-900 rounded-lg flex items-center justify-center text-orange-500 text-[10px] font-bold">
            NT
          </div>
          <div>
            <h1 className="text-lg font-bold">NHÀ BẾP</h1>
            <div className="flex items-center gap-2">
              <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-500' : 'bg-red-500')}></span>
              <span className={cn('text-xs', connected ? 'text-green-500' : 'text-red-500')}>
                {connected ? 'Đang hoạt động' : 'Mất kết nối'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs border',
              soundEnabled ? 'bg-dark-500 border-dark-400 text-green-400' : 'bg-dark-500 border-dark-400 text-gray-500'
            )}
          >
            {soundEnabled ? '🔔 Bật' : '🔕 Tắt'}
          </button>
          <button
            onClick={loadQueue}
            className="bg-dark-500 border border-dark-400 text-gray-400 px-3 py-1.5 rounded-md text-xs"
          >
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 overflow-hidden">
        {/* Column: Chờ xử lý */}
        <KanbanColumn
          title="CHỜ XỬ LÝ"
          icon="🔴"
          color="border-t-red-500"
          count={queue.pending.length}
          items={queue.pending}
          actionLabel="Làm"
          actionClass="bg-orange-500 text-white"
          onAction={startCooking}
        />

        {/* Column: Đang làm */}
        <KanbanColumn
          title="ĐANG LÀM"
          icon="🟠"
          color="border-t-orange-500"
          count={queue.cooking.length}
          items={queue.cooking}
          actionLabel="Xong"
          actionClass="bg-green-500 text-white"
          onAction={markReady}
          showTimer
        />

        {/* Column: Sẵn sàng */}
        <KanbanColumn
          title="SẴN SÀNG"
          icon="🟡"
          color="border-t-yellow-500"
          count={queue.ready.length}
          items={queue.ready}
          actionLabel="Ra món"
          actionClass="bg-blue-500 text-white"
          onAction={markServed}
        />

        {/* Stats Panel (desktop: 4th column, mobile: hidden) */}
        <div className="hidden lg:flex flex-col gap-3">
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 mb-3">THỐNG KÊ</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Tổng món" value={stats.total} color="text-orange-500" />
              <StatBox label="Hoàn thành" value={stats.completed} color="text-green-500" />
              <StatBox label="Đang chờ" value={stats.pending} color="text-red-500" />
              <StatBox label="Đang làm" value={stats.cooking} color="text-yellow-500" />
            </div>
            <div className="mt-3 pt-3 border-t border-dark-400 text-center">
              <span className="text-2xl font-bold text-orange-500">{stats.avgTime}p</span>
              <p className="text-xs text-gray-500">TB thời gian</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar (mobile) */}
      <div className="lg:hidden bg-dark-700 border-t border-dark-400 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-400 font-semibold">THỐNG KÊ</span>
        <div className="flex gap-5">
          <MiniStat label="Tổng" value={stats.total} />
          <MiniStat label="Chờ" value={stats.pending} />
          <MiniStat label="Làm" value={stats.cooking} />
          <MiniStat label="Xong" value={stats.completed} />
          <MiniStat label="TB" value={`${stats.avgTime}p`} />
        </div>
      </div>
    </div>
  );
}

// ===== Kanban Column =====
function KanbanColumn({
  title, icon, color, count, items, actionLabel, actionClass, onAction, showTimer,
}: {
  title: string;
  icon: string;
  color: string;
  count: number;
  items: KitchenItem[];
  actionLabel: string;
  actionClass: string;
  onAction: (id: string) => void;
  showTimer?: boolean;
}) {
  return (
    <div className={cn('bg-dark-700 rounded-xl flex flex-col overflow-hidden border-t-[3px]', color)}>
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-dark-400">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          {icon} {title}
        </h3>
        <span className="bg-dark-500 text-gray-400 text-[10px] px-1.5 py-0.5 rounded font-semibold">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-200px)]">
        {items.map((item) => (
          <DishCard
            key={item.id}
            item={item}
            actionLabel={actionLabel}
            actionClass={actionClass}
            onAction={() => onAction(item.id)}
            showTimer={showTimer}
          />
        ))}
        {items.length === 0 && (
          <p className="text-center text-gray-600 text-xs py-8">Không có món</p>
        )}
      </div>
    </div>
  );
}

// ===== Dish Card =====
function DishCard({
  item, actionLabel, actionClass, onAction, showTimer,
}: {
  item: KitchenItem;
  actionLabel: string;
  actionClass: string;
  onAction: () => void;
  showTimer?: boolean;
}) {
  const waitMinutes = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000);
  const isUrgent = waitMinutes >= 10;
  const isWarning = waitMinutes >= 7;

  return (
    <div className={cn(
      'bg-dark-600 rounded-lg p-3 border border-dark-400',
      isUrgent ? 'border-l-[3px] border-l-red-500' :
      isWarning ? 'border-l-[3px] border-l-orange-500' :
      'border-l-[3px] border-l-green-500',
    )}>
      {/* Row 1: Table + Time */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn(
          'text-[11px] font-bold px-1.5 py-0.5 rounded',
          isUrgent ? 'bg-red-500 text-white' : 'bg-orange-500 text-white',
        )}>
          {item.order.table.name}
        </span>
        <span className={cn(
          'text-[10px] flex items-center gap-1',
          isUrgent ? 'text-red-400 font-semibold' : 'text-gray-500',
        )}>
          ⏱ {waitMinutes} phút
        </span>
      </div>

      {/* Row 2: Dish name + Qty */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-semibold text-white flex-1 mr-2">{item.menuItem.name}</span>
        <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0">
          {item.quantity}
        </span>
      </div>

      {/* Note */}
      {item.note && (
        <div className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded mb-1.5">
          📝 {item.note}
        </div>
      )}

      {/* Row 3: Staff + Action */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-500">
          {item.assignedTo ? `👨‍🍳 ${item.assignedTo.name}` : item.order.staff?.name || 'QR Order'}
        </span>
        <button
          onClick={onAction}
          className={cn('px-3 py-1 rounded text-[10px] font-semibold active:scale-95 transition-transform', actionClass)}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// ===== Stat Components =====
function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={cn('text-lg font-bold', color)}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold text-orange-500">{value}</div>
      <div className="text-[9px] text-gray-500">{label}</div>
    </div>
  );
}

// ===== Sound =====
function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gain.gain.value = 0.3;
    oscillator.start();
    setTimeout(() => { oscillator.stop(); ctx.close(); }, 200);
  } catch {}
}

// ===== Mock data =====
const MOCK_QUEUE: KitchenQueue = {
  pending: [
    { id: 'p1', menuItem: { name: 'Tôm hùm đúc lò', prepTime: 20 }, order: { table: { name: 'A09' }, staff: { name: 'Nguyễn Văn Nam' }, orderNumber: 32 }, quantity: 1, status: 'pending', createdAt: new Date(Date.now() - 480000).toISOString() },
    { id: 'p2', menuItem: { name: 'Mực nướng muối ớt', prepTime: 12 }, order: { table: { name: 'A09' }, staff: { name: 'Nguyễn Văn Nam' }, orderNumber: 32 }, quantity: 1, status: 'pending', createdAt: new Date(Date.now() - 480000).toISOString() },
    { id: 'p3', menuItem: { name: 'Cánh gà chiên mắm', prepTime: 12 }, order: { table: { name: 'B03' }, staff: { name: 'Trần Thị Hoa' }, orderNumber: 30 }, quantity: 2, note: 'Không cay, thêm sốt me', status: 'pending', createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'p4', menuItem: { name: 'Nem chua rán', prepTime: 8 }, order: { table: { name: 'B03' }, staff: { name: 'Trần Thị Hoa' }, orderNumber: 30 }, quantity: 1, status: 'pending', createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'p5', menuItem: { name: 'Lẩu nướng BBQ', prepTime: 15 }, order: { table: { name: 'A07' }, staff: { name: 'Lê Văn Tài' }, orderNumber: 31 }, quantity: 1, note: 'Nước lẩu chua cay', status: 'pending', createdAt: new Date(Date.now() - 120000).toISOString() },
    { id: 'p6', menuItem: { name: 'Khoai tây chiên', prepTime: 8 }, order: { table: { name: 'A07' }, staff: { name: 'Lê Văn Tài' }, orderNumber: 31 }, quantity: 2, status: 'pending', createdAt: new Date(Date.now() - 120000).toISOString() },
    { id: 'p7', menuItem: { name: 'Bò lúc lắc', prepTime: 10 }, order: { table: { name: 'C05' }, staff: { name: 'Phạm Văn Hòa' }, orderNumber: 33 }, quantity: 1, status: 'pending', createdAt: new Date(Date.now() - 60000).toISOString() },
  ],
  cooking: [
    { id: 'c1', menuItem: { name: 'Thát bát cá lóc', prepTime: 20 }, order: { table: { name: 'A01' }, staff: { name: 'Nguyễn Văn Nam' }, orderNumber: 28 }, quantity: 1, status: 'cooking', assignedTo: { id: 'chef-1', name: 'Minh' }, createdAt: new Date(Date.now() - 720000).toISOString(), startedAt: new Date(Date.now() - 600000).toISOString() },
    { id: 'c2', menuItem: { name: 'Mực nướng muối ớt', prepTime: 12 }, order: { table: { name: 'A01' }, staff: { name: 'Nguyễn Văn Nam' }, orderNumber: 28 }, quantity: 1, status: 'cooking', assignedTo: { id: 'chef-2', name: 'Hùng' }, createdAt: new Date(Date.now() - 600000).toISOString(), startedAt: new Date(Date.now() - 480000).toISOString() },
    { id: 'c3', menuItem: { name: 'Sườn nướng', prepTime: 15 }, order: { table: { name: 'C03' }, staff: { name: 'Trần Văn Hải' }, orderNumber: 29 }, quantity: 2, note: 'Nướng chín kỹ', status: 'cooking', assignedTo: { id: 'chef-1', name: 'Minh' }, createdAt: new Date(Date.now() - 480000).toISOString(), startedAt: new Date(Date.now() - 360000).toISOString() },
    { id: 'c4', menuItem: { name: 'Cơm rang dương châu', prepTime: 8 }, order: { table: { name: 'B05' }, staff: { name: 'Nguyễn Thị Hằng' }, orderNumber: 27 }, quantity: 3, status: 'cooking', assignedTo: { id: 'chef-3', name: 'Lan' }, createdAt: new Date(Date.now() - 300000).toISOString(), startedAt: new Date(Date.now() - 240000).toISOString() },
  ],
  ready: [
    { id: 'r1', menuItem: { name: 'Mực nướng sa tế', prepTime: 10 }, order: { table: { name: 'A03' }, staff: { name: 'Nguyễn Thị Bé' }, orderNumber: 25 }, quantity: 2, status: 'ready', assignedTo: { id: 'chef-2', name: 'Hùng' }, createdAt: new Date(Date.now() - 600000).toISOString(), completedAt: new Date(Date.now() - 120000).toISOString() },
    { id: 'r2', menuItem: { name: 'Mì xào hải sản', prepTime: 12 }, order: { table: { name: 'B01' }, staff: { name: 'Phạm Văn Hòa' }, orderNumber: 26 }, quantity: 2, status: 'ready', assignedTo: { id: 'chef-3', name: 'Lan' }, createdAt: new Date(Date.now() - 480000).toISOString(), completedAt: new Date(Date.now() - 60000).toISOString() },
    { id: 'r3', menuItem: { name: 'Rau muống xào', prepTime: 5 }, order: { table: { name: 'B01' }, staff: { name: 'Phạm Văn Hòa' }, orderNumber: 26 }, quantity: 1, status: 'ready', assignedTo: { id: 'chef-1', name: 'Minh' }, createdAt: new Date(Date.now() - 480000).toISOString(), completedAt: new Date(Date.now() - 30000).toISOString() },
  ],
};
