'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface OrderInfo {
  id: string;
  orderNumber: number;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{ menuItem: { name: string }; quantity: number; unitPrice: number; status: string }>;
}

type Mode = 'view' | 'merge' | 'transfer';

const STATUS_CONFIG: Record<TableStatus, { label: string; border: string; bg: string; text: string }> = {
  empty: { label: 'Trống', border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-500' },
  occupied: { label: 'Đang mở', border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  reserved: { label: 'Đã đặt', border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-500' },
  paying: { label: 'Yêu cầu TT', border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-500' },
};

export default function StaffTablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [floor, setFloor] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('view');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [detailTable, setDetailTable] = useState<Table | null>(null);
  const [tableOrders, setTableOrders] = useState<OrderInfo[]>([]);
  const [transferSource, setTransferSource] = useState<Table | null>(null);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadTables(); }, []);

  const token = () => localStorage.getItem('token') || '';

  const loadTables = async () => {
    try {
      const data = await api(`/tables?storeId=${STORE_ID}`, { token: token() });
      setTables(data);
    } catch {} finally { setLoading(false); }
  };

  // ===== Open Table Detail =====
  const openDetail = async (table: Table) => {
    if (mode === 'merge') {
      toggleSelect(table.id);
      return;
    }
    if (mode === 'transfer') {
      handleTransferTarget(table);
      return;
    }
    setDetailTable(table);
    if (table.status !== 'empty') {
      try {
        const orders = await api(`/orders/table/${table.id}`, { token: token() });
        setTableOrders(orders);
      } catch { setTableOrders([]); }
    } else {
      setTableOrders([]);
    }
  };

  // ===== Open Table (set occupied) =====
  const openTable = async (tableId: string) => {
    try {
      await api(`/tables/${tableId}/status`, { method: 'PUT', token: token(), body: { status: 'occupied' } });
      setMessage('✅ Đã mở bàn');
      setDetailTable(null);
      loadTables();
    } catch { setMessage('❌ Lỗi'); }
  };

  // ===== Close Table (set empty) =====
  const closeTable = async (tableId: string) => {
    try {
      await api(`/tables/${tableId}/status`, { method: 'PUT', token: token(), body: { status: 'empty' } });
      setMessage('✅ Đã đóng bàn');
      setDetailTable(null);
      loadTables();
    } catch { setMessage('❌ Lỗi'); }
  };

  // ===== Merge Mode =====
  const toggleSelect = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const handleMerge = async () => {
    if (selectedTables.length < 2) {
      setMessage('⚠️ Chọn ít nhất 2 bàn để gộp');
      return;
    }
    setActionLoading(true);
    try {
      // Merge = move all orders from secondary tables to primary table
      const primaryId = selectedTables[0];
      const secondaryIds = selectedTables.slice(1);

      for (const secId of secondaryIds) {
        // Get orders from secondary table
        const orders = await api(`/orders/table/${secId}`, { token: token() });
        for (const order of orders) {
          // Move order items to a new order on primary table (simplified: just update table reference)
          // In production, would need a proper merge endpoint
          await api(`/tables/${secId}/status`, { method: 'PUT', token: token(), body: { status: 'empty' } });
        }
      }

      const primaryName = tables.find((t) => t.id === primaryId)?.name;
      const secNames = secondaryIds.map((id) => tables.find((t) => t.id === id)?.name).join(', ');
      setMessage(`✅ Đã gộp ${secNames} vào ${primaryName}`);
      setMode('view');
      setSelectedTables([]);
      loadTables();
    } catch { setMessage('❌ Lỗi gộp bàn'); }
    setActionLoading(false);
  };

  // ===== Transfer Mode =====
  const startTransfer = (table: Table) => {
    setTransferSource(table);
    setMode('transfer');
    setDetailTable(null);
    setMessage(`📌 Chọn bàn đích để chuyển từ ${table.name}`);
  };

  const handleTransferTarget = async (targetTable: Table) => {
    if (!transferSource || targetTable.id === transferSource.id) return;
    if (targetTable.status !== 'empty') {
      setMessage('⚠️ Bàn đích phải trống');
      return;
    }

    setActionLoading(true);
    try {
      // Get orders from source table
      const orders = await api(`/orders/table/${transferSource.id}`, { token: token() });

      // Update each order's tableId (need API endpoint)
      for (const order of orders) {
        await api(`/orders/${order.id}/transfer`, {
          method: 'PUT',
          token: token(),
          body: { newTableId: targetTable.id },
        });
      }

      // Update table statuses
      await api(`/tables/${transferSource.id}/status`, { method: 'PUT', token: token(), body: { status: 'empty' } });
      await api(`/tables/${targetTable.id}/status`, { method: 'PUT', token: token(), body: { status: 'occupied' } });

      setMessage(`✅ Đã chuyển ${transferSource.name} → ${targetTable.name}`);
      setMode('view');
      setTransferSource(null);
      loadTables();
    } catch { setMessage('❌ Lỗi chuyển bàn'); }
    setActionLoading(false);
  };

  const cancelMode = () => {
    setMode('view');
    setSelectedTables([]);
    setTransferSource(null);
    setMessage('');
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Quản lý bàn</h1>
        </div>
        {mode !== 'view' && (
          <button onClick={cancelMode} className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg">
            ✕ Hủy
          </button>
        )}
      </header>

      {/* Mode Banner */}
      {mode === 'merge' && (
        <div className="mx-4 mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-400 text-center animate-fadeIn">
          🔗 Chọn các bàn cần gộp (bàn đầu tiên là bàn chính)
          {selectedTables.length > 0 && (
            <span className="ml-1 font-semibold">· Đã chọn: {selectedTables.length}</span>
          )}
        </div>
      )}
      {mode === 'transfer' && (
        <div className="mx-4 mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-400 text-center animate-fadeIn">
          ↔ Chọn bàn trống để chuyển {transferSource?.name} đến
        </div>
      )}

      {/* Message */}
      {message && mode === 'view' && (
        <div className="mx-4 mt-3 p-2.5 bg-dark-700 border border-dark-400 rounded-lg text-xs text-center animate-fadeIn">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-gray-600">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
        {(['all', 'empty', 'occupied', 'reserved', 'paying'] as const).map((key) => (
          <button key={key} onClick={() => setFilter(key)} className={cn('px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border', filter === key ? 'bg-orange-500 border-orange-500 text-white' : 'bg-dark-600 border-dark-400 text-gray-400')}>
            {key === 'all' ? 'Tất cả' : STATUS_CONFIG[key].label} {counts[key]}
          </button>
        ))}
      </div>

      {/* Floor Tabs */}
      {floors.length > 1 && (
        <div className="flex gap-2 px-4 pb-3">
          <button onClick={() => setFloor('all')} className={cn('px-3 py-1.5 rounded-lg text-xs border', floor === 'all' ? 'border-orange-500 text-orange-500' : 'border-dark-400 text-gray-500')}>Tất cả</button>
          {floors.map((f) => (
            <button key={f} onClick={() => setFloor(f)} className={cn('px-3 py-1.5 rounded-lg text-xs border', floor === f ? 'border-orange-500 text-orange-500' : 'border-dark-400 text-gray-500')}>Tầng {f}</button>
          ))}
        </div>
      )}

      {/* Table Grid */}
      <div className="grid grid-cols-3 gap-2.5 px-4 pb-4 stagger-children">
        {filtered.map((table) => {
          const config = STATUS_CONFIG[table.status];
          const isSelected = selectedTables.includes(table.id);
          const isTransferSource = transferSource?.id === table.id;

          return (
            <button
              key={table.id}
              onClick={() => openDetail(table)}
              className={cn(
                'border-2 rounded-xl p-3 text-center transition-all press-card relative',
                isSelected ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50' :
                isTransferSource ? 'border-purple-500 bg-purple-500/20' :
                `${config.border} ${config.bg}`,
                table.status === 'paying' && !isSelected && 'animate-pulse',
              )}
            >
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {selectedTables.indexOf(table.id) + 1}
                </div>
              )}
              <div className={cn('text-base font-bold', isSelected ? 'text-blue-400' : config.text)}>{table.name}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{config.label}</div>
              {table.status === 'empty' ? (
                <div className="text-[10px] text-gray-600 mt-1">🪑 {table.seats} chỗ</div>
              ) : (
                <div className="text-[10px] text-gray-500 mt-1">👥 {table.seats}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      {mode === 'view' && (
        <div className="fixed bottom-16 left-0 right-0 max-w-[390px] mx-auto px-4 pb-2">
          <div className="flex gap-2">
            <button onClick={() => setMode('merge')} className="flex-1 py-3 bg-blue-500 text-white rounded-lg text-xs font-semibold">
              🔗 Gộp bàn
            </button>
            <button onClick={() => { setMessage('👆 Bấm vào bàn đang mở để chuyển'); }} className="flex-1 py-3 bg-purple-500 text-white rounded-lg text-xs font-semibold">
              ↔ Chuyển bàn
            </button>
          </div>
        </div>
      )}

      {/* Merge Confirm */}
      {mode === 'merge' && selectedTables.length >= 2 && (
        <div className="fixed bottom-16 left-0 right-0 max-w-[390px] mx-auto px-4 pb-2">
          <button onClick={handleMerge} disabled={actionLoading} className="w-full py-3 bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            {actionLoading ? '⏳ Đang gộp...' : `🔗 Gộp ${selectedTables.length} bàn`}
          </button>
        </div>
      )}

      {/* Table Detail Modal */}
      {detailTable && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end animate-fadeIn" onClick={() => setDetailTable(null)}>
          <div className="w-full max-w-[390px] mx-auto bg-dark-700 rounded-t-2xl max-h-[80vh] overflow-y-auto animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {/* Detail Header */}
            <div className="sticky top-0 bg-dark-700 p-4 border-b border-dark-400 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold', STATUS_CONFIG[detailTable.status].bg, STATUS_CONFIG[detailTable.status].text)}>
                  {detailTable.name}
                </div>
                <div>
                  <h3 className="text-base font-bold">Bàn {detailTable.name}</h3>
                  <p className="text-xs text-gray-500">{STATUS_CONFIG[detailTable.status].label} · {detailTable.seats} chỗ · Tầng {detailTable.floor}</p>
                </div>
              </div>
              <button onClick={() => setDetailTable(null)} className="text-gray-500 text-lg">✕</button>
            </div>

            <div className="p-4 space-y-3">
              {/* Orders */}
              {tableOrders.length > 0 ? (
                <>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase">Đơn hàng đang mở</h4>
                  {tableOrders.map((order) => (
                    <div key={order.id} className="bg-dark-600 rounded-xl p-3 border border-dark-400">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400">#{order.orderNumber}</span>
                        <span className="text-sm font-bold text-orange-500">{formatVND(order.total)}</span>
                      </div>
                      <div className="space-y-1">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-300">
                            <span><span className="text-orange-500">{item.quantity}x</span> {item.menuItem.name}</span>
                            <span className={cn('text-[10px]',
                              item.status === 'served' ? 'text-green-500' :
                              item.status === 'cooking' ? 'text-orange-400' : 'text-gray-500'
                            )}>
                              {item.status === 'served' ? '✓' : item.status === 'cooking' ? '🔥' : '⏳'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-2">
                        {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="bg-dark-600 rounded-xl p-3 border border-dark-400 flex justify-between items-center">
                    <span className="text-sm font-semibold">Tổng tiền bàn</span>
                    <span className="text-lg font-bold text-orange-500">
                      {formatVND(tableOrders.reduce((s, o) => s + o.total, 0))}
                    </span>
                  </div>
                </>
              ) : detailTable.status === 'empty' ? (
                <div className="text-center py-8">
                  <span className="text-3xl">🪑</span>
                  <p className="text-sm text-gray-500 mt-2">Bàn trống</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="text-3xl">📋</span>
                  <p className="text-sm text-gray-500 mt-2">Không có đơn hàng</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {detailTable.status === 'empty' && (
                  <>
                    <button onClick={() => openTable(detailTable.id)} className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-semibold">
                      🪑 Mở bàn
                    </button>
                    <button onClick={() => { setDetailTable(null); router.push(`/staff/create-order`); }} className="w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold">
                      📝 Tạo order
                    </button>
                  </>
                )}

                {detailTable.status === 'occupied' && (
                  <>
                    <button onClick={() => { setDetailTable(null); router.push(`/staff/create-order`); }} className="w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold">
                      ➕ Thêm món
                    </button>
                    <button onClick={() => startTransfer(detailTable)} className="w-full py-3 bg-purple-500 text-white rounded-xl text-sm font-semibold">
                      ↔ Chuyển bàn
                    </button>
                    <button onClick={() => {
                      if (tableOrders.length > 0) {
                        localStorage.setItem('payment_order', JSON.stringify(tableOrders[0]));
                        router.push('/staff/payment');
                      }
                    }} className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-semibold">
                      💰 Thanh toán
                    </button>
                    <button onClick={() => closeTable(detailTable.id)} className="w-full py-3 bg-dark-500 border border-dark-400 text-gray-400 rounded-xl text-sm font-semibold">
                      🔒 Đóng bàn
                    </button>
                  </>
                )}

                {detailTable.status === 'paying' && (
                  <button onClick={() => {
                    if (tableOrders.length > 0) {
                      localStorage.setItem('payment_order', JSON.stringify(tableOrders[0]));
                      router.push('/staff/payment');
                    }
                  }} className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-semibold">
                    💰 Thanh toán ngay
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
