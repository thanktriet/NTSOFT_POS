'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

type PaymentMethod = 'cash' | 'qr_transfer' | 'momo' | 'card' | 'mixed';

interface OrderItem {
  menuItem: { name: string };
  quantity: number;
  unitPrice: number;
  note?: string;
}

interface Order {
  id: string;
  orderNumber: number;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  table: { id: string; name: string };
  items: OrderItem[];
  createdAt: string;
}

export default function StaffPaymentPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('payment_order');
    if (stored) {
      const o = JSON.parse(stored);
      setOrder(o);
    } else {
      router.push('/staff/orders');
    }
  }, []);

  const token = () => localStorage.getItem('token') || '';

  const subtotal = order ? (order.subtotal || order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)) : 0;
  const discount = Math.round(subtotal * discountPercent / 100);
  const total = subtotal - discount;
  const cashNum = parseInt(cashReceived.replace(/\D/g, '') || '0');
  const change = cashNum - total;

  useEffect(() => {
    if (!order || method !== 'qr_transfer' || total <= 0) return;
    const loadQr = async () => {
      try {
        const storeAuth = localStorage.getItem('store_auth');
        const storeId = storeAuth ? JSON.parse(storeAuth).store.id : 'store-001';
        const data = await api(`/payments/qr?amount=${total}&table=${order.table?.name || '—'}&storeId=${storeId}`);
        setQrData(data);
      } catch {}
    };
    loadQr();
  }, [method, total, order]);

  const handlePayment = async () => {
    if (!order) return;
    setProcessing(true);
    setError('');
    try {
      const result = await api(`/payments/process/${order.id}`, {
        method: 'POST',
        token: token(),
        body: {
          method,
          discount,
          received: method === 'cash' ? cashNum : undefined,
        },
      });
      setPaymentResult(result.payment);
      setPaid(true);
      localStorage.removeItem('payment_order');
    } catch (err: any) {
      setError(err.message || 'Lỗi thanh toán');
    }
    setProcessing(false);
  };

  const printBill = async () => {
    if (!order) return;
    try {
      const data = await api(`/print/receipt/${order.id}/text`, { token: token() });
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head><title>Bill ${order.table?.name || '—'}</title><style>body{font-family:monospace;font-size:12px;white-space:pre-wrap;padding:20px;max-width:300px;margin:0 auto}</style></head><body>${data.text}\n\n<button onclick="window.print()">🖨️ In</button></body></html>`);
        win.document.close();
      }
    } catch {}
  };

  // Loading state
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ===== Success Screen =====
  if (paid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fadeInUp">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounceIn">
            ✅
          </div>
          <h2 className="text-xl font-bold mb-2">Thanh toán thành công!</h2>
          <p className="text-gray-400 text-sm mb-1">Bàn {order.table?.name || '—'} · {formatVND(paymentResult?.total || total)}</p>
          {method === 'cash' && change > 0 && (
            <p className="text-green-400 text-sm font-semibold">Tiền thối: {formatVND(change)}</p>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={printBill} className="flex-1 py-3 bg-dark-600 border border-dark-400 rounded-xl text-sm font-semibold text-gray-300">
              🖨️ In bill
            </button>
            <Link href="/staff/orders" className="flex-1 py-3 bg-orange-500 rounded-xl text-sm font-semibold text-white text-center">
              Đơn hàng →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff/orders" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Thanh toán</h1>
        </div>
        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">Bàn {order.table?.name || '—'}</span>
      </header>

      {/* Bill Detail */}
      <div className="mx-4 mt-4 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-dark-400">
          <h3 className="text-sm font-semibold">Chi tiết hóa đơn</h3>
          <span className="text-[11px] text-gray-500">#{order.orderNumber}</span>
        </div>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-xs text-gray-300 py-1.5 border-b border-dark-500 last:border-0">
            <span className="flex-1">{item.menuItem.name}</span>
            <span className="w-8 text-center text-orange-500 font-semibold">x{item.quantity}</span>
            <span className="w-20 text-right">{formatVND(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-dark-400 mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Tạm tính</span><span>{formatVND(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs text-green-400">
              <span>Giảm giá ({discountPercent}%)</span><span>-{formatVND(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Tổng</span><span className="text-orange-500">{formatVND(total)}</span>
          </div>
        </div>
      </div>

      {/* Discount */}
      <div className="mx-4 mt-3 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <h3 className="text-xs font-semibold mb-3">Giảm giá</h3>
        <div className="flex gap-1.5">
          {[0, 5, 10, 15, 20].map((pct) => (
            <button
              key={pct}
              onClick={() => setDiscountPercent(pct)}
              className={cn('flex-1 py-2 rounded-lg text-xs font-semibold border', discountPercent === pct ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-dark-400 text-gray-500')}
            >
              {pct === 0 ? '0%' : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="mx-4 mt-3 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <h3 className="text-xs font-semibold mb-3">Phương thức</h3>
        <div className="grid grid-cols-4 gap-2">
          {([
            { key: 'cash', icon: '💵', label: 'Mặt' },
            { key: 'qr_transfer', icon: '📱', label: 'QR' },
            { key: 'card', icon: '💳', label: 'Thẻ' },
            { key: 'mixed', icon: '🔀', label: 'Hỗn hợp' },
          ] as const).map((pm) => (
            <button
              key={pm.key}
              onClick={() => setMethod(pm.key)}
              className={cn('p-3 rounded-xl border text-center', method === pm.key ? 'border-orange-500 bg-orange-500/10' : 'border-dark-400 bg-dark-500')}
            >
              <div className="text-lg mb-0.5">{pm.icon}</div>
              <div className={cn('text-[10px]', method === pm.key ? 'text-orange-500 font-semibold' : 'text-gray-400')}>{pm.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cash Input */}
      {method === 'cash' && (
        <div className="mx-4 mt-3 bg-dark-600 rounded-xl p-4 border border-dark-400">
          <h3 className="text-xs font-semibold mb-3">Khách đưa</h3>
          <input
            type="text"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))}
            placeholder={total.toString()}
            className="w-full bg-dark-500 border border-dark-400 rounded-lg px-4 py-3 text-white text-lg font-bold text-right outline-none focus:border-orange-500"
          />
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {[total, Math.ceil(total / 100000) * 100000, Math.ceil(total / 500000) * 500000, 1000000, 2000000].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5).map((preset) => (
              <button key={preset} onClick={() => setCashReceived(preset.toString())} className="py-2 bg-dark-500 border border-dark-400 rounded-lg text-[11px] text-gray-400">
                {formatVND(preset)}
              </button>
            ))}
            <button onClick={() => setCashReceived(total.toString())} className="py-2 bg-dark-500 border border-dark-400 rounded-lg text-[11px] text-gray-400">
              Đúng tiền
            </button>
          </div>
          {cashNum >= total && cashNum > 0 && (
            <div className="mt-3 p-3 bg-green-500/10 rounded-lg flex justify-between">
              <span className="text-sm text-green-400">Tiền thối</span>
              <span className="text-sm text-green-400 font-bold">{formatVND(change)}</span>
            </div>
          )}
        </div>
      )}

      {/* QR Display */}
      {method === 'qr_transfer' && qrData && (
        <div className="mx-4 mt-3 bg-dark-600 rounded-xl p-4 border border-dark-400 text-center">
          <h3 className="text-xs font-semibold mb-3">QR Thanh toán</h3>
          <div className="bg-white rounded-xl p-2 inline-block">
            <img src={qrData.qrUrl} alt="VietQR" className="w-44 h-auto" />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">{qrData.accountName}</p>
          <p className="text-[11px] text-gray-500">STK: {qrData.accountNumber}</p>
          <p className="text-xs text-orange-500 font-semibold mt-1">{formatVND(total)}</p>
        </div>
      )}

      {/* Error */}
      {error && <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 text-center">{error}</div>}

      {/* Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 p-4 border-t border-dark-400 flex gap-2">
        <button onClick={printBill} className="py-3.5 px-4 bg-dark-500 rounded-xl text-sm font-semibold text-gray-300">
          🖨️
        </button>
        <button
          onClick={handlePayment}
          disabled={processing || (method === 'cash' && cashNum < total)}
          className="flex-1 py-3.5 bg-green-500 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
        >
          {processing ? '⏳ Đang xử lý...' : `✓ Thanh toán · ${formatVND(total)}`}
        </button>
      </div>
    </div>
  );
}
