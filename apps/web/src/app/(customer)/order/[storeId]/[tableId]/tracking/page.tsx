'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getOrdersByTable } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

interface OrderItem {
  id: string;
  menuItem: { name: string };
  quantity: number;
  status: 'pending' | 'cooking' | 'ready' | 'served';
  note?: string;
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_CONFIG = {
  pending: { label: 'Chờ xác nhận', color: 'text-gray-500', bg: 'bg-gray-100', icon: '⏳' },
  cooking: { label: 'Đang chế biến', color: 'text-orange-500', bg: 'bg-orange-50', icon: '🔥' },
  ready: { label: 'Sẵn sàng', color: 'text-blue-500', bg: 'bg-blue-50', icon: '✅' },
  served: { label: 'Đã phục vụ', color: 'text-green-500', bg: 'bg-green-50', icon: '🍽️' },
};

export default function OrderTrackingPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const tableId = params.tableId as string;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    // Poll every 10s (WebSocket will replace this)
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [tableId]);

  const loadOrders = async () => {
    try {
      const data = await getOrdersByTable(tableId);
      setOrders(data);
    } catch (err) {
      // Use mock for preview
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate all items across orders
  const allItems = orders.flatMap((o) => o.items);
  const cookingCount = allItems.filter((i) => i.status === 'cooking').length;
  const readyCount = allItems.filter((i) => i.status === 'ready').length;
  const servedCount = allItems.filter((i) => i.status === 'served').length;
  const pendingCount = allItems.filter((i) => i.status === 'pending').length;
  const totalCount = allItems.length;

  // Overall progress
  const progress = totalCount > 0 ? Math.round(((servedCount + readyCount) / totalCount) * 100) : 0;

  // Current stage
  const currentStage =
    servedCount === totalCount ? 'served' :
    readyCount > 0 ? 'ready' :
    cookingCount > 0 ? 'cooking' : 'pending';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <span className="text-5xl mb-4">📋</span>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Chưa có đơn hàng</h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Bàn này chưa có đơn hàng nào. Hãy đặt món trước nhé!
        </p>
        <Link
          href={`/order/${storeId}/${tableId}`}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-semibold"
        >
          📋 Xem menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <Link href={`/order/${storeId}/${tableId}`} className="text-xl">←</Link>
        <h1 className="text-base font-semibold text-gray-900">Theo dõi đơn hàng</h1>
      </header>

      {/* Status Banner */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl p-5 text-white text-center">
        <div className="text-4xl mb-2">
          {currentStage === 'served' ? '🎉' : currentStage === 'ready' ? '✅' : '👨‍🍳'}
        </div>
        <h2 className="text-lg font-bold">
          {currentStage === 'served' ? 'Đã phục vụ xong!' :
           currentStage === 'ready' ? 'Món đã sẵn sàng!' :
           currentStage === 'cooking' ? 'Đang chế biến' : 'Đang chờ bếp xác nhận'}
        </h2>
        <p className="text-sm opacity-90 mt-1">
          {currentStage === 'cooking'
            ? `${cookingCount} món đang được làm`
            : currentStage === 'ready'
            ? `${readyCount} món sẵn sàng phục vụ`
            : currentStage === 'pending'
            ? 'Bếp sẽ bắt đầu ngay'
            : 'Chúc quý khách ngon miệng!'}
        </p>

        {/* Progress bar */}
        <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs opacity-80 mt-1">{progress}% hoàn thành</p>
      </div>

      {/* Progress Steps */}
      <div className="mx-4 mt-4 bg-white rounded-xl p-5">
        <div className="space-y-0">
          {[
            { key: 'ordered', label: 'Đã đặt món', desc: `${totalCount} món`, done: true },
            { key: 'confirmed', label: 'Bếp xác nhận', desc: 'Bếp đã nhận đơn', done: currentStage !== 'pending' },
            { key: 'cooking', label: 'Đang chế biến', desc: `${cookingCount} món đang được làm`, done: currentStage === 'ready' || currentStage === 'served', active: currentStage === 'cooking' },
            { key: 'ready', label: 'Sẵn sàng phục vụ', desc: `${readyCount} món`, done: currentStage === 'served', active: currentStage === 'ready' },
            { key: 'served', label: 'Đã phục vụ', desc: 'Chúc ngon miệng!', done: currentStage === 'served' },
          ].map((step, i) => (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                    step.done ? 'bg-green-500 text-white' :
                    step.active ? 'bg-orange-500 text-white animate-pulse' :
                    'bg-gray-200 text-gray-400',
                  )}
                >
                  {step.done ? '✓' : step.active ? '🔥' : i + 1}
                </div>
                {i < 4 && (
                  <div className={cn(
                    'w-0.5 h-6 my-1',
                    step.done ? 'bg-green-500' : 'bg-gray-200',
                  )}></div>
                )}
              </div>
              <div className="pb-4">
                <p className={cn(
                  'text-sm font-medium',
                  step.done || step.active ? 'text-gray-900' : 'text-gray-400',
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Item List */}
      <div className="mx-4 mt-4 bg-white rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Chi tiết từng món</h3>
        <div className="space-y-2">
          {allItems.map((item) => {
            const config = STATUS_CONFIG[item.status];
            return (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🍽️</span>
                  <span className="text-sm text-gray-700">
                    {item.menuItem.name} x{item.quantity}
                  </span>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', config.bg, config.color)}>
                  {config.icon} {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="mx-4 mt-4 space-y-2">
        <Link
          href={`/order/${storeId}/${tableId}`}
          className="block w-full bg-orange-500 text-white py-3.5 rounded-xl text-sm font-semibold text-center"
        >
          ➕ Gọi thêm món
        </Link>
        <button className="w-full bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-semibold">
          🛎️ Gọi phục vụ
        </button>
        <button className="w-full bg-white border border-red-200 text-red-500 py-3.5 rounded-xl text-sm font-semibold">
          💳 Yêu cầu thanh toán
        </button>
      </div>
    </div>
  );
}

// ===== Mock data =====
const MOCK_ORDERS: Order[] = [
  {
    id: 'order-1',
    orderNumber: 1,
    status: 'cooking',
    total: 850000,
    createdAt: new Date(Date.now() - 600000).toISOString(),
    items: [
      { id: 'oi-1', menuItem: { name: 'Bò nướng tảng' }, quantity: 1, status: 'cooking' },
      { id: 'oi-2', menuItem: { name: 'Mực nướng muối ớt' }, quantity: 1, status: 'cooking' },
      { id: 'oi-3', menuItem: { name: 'Cánh gà chiên mắm' }, quantity: 1, status: 'cooking' },
      { id: 'oi-4', menuItem: { name: 'Tiger Bạc' }, quantity: 3, status: 'served' },
    ],
  },
];
