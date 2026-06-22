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
  tableId?: string;
  table?: { id: string; name: string };
  items: OrderItem[];
  createdAt: string;
}

export default function StaffPaymentPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [allItems, setAllItems] = useState<OrderItem[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
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
      loadTableOrders(o.table?.id || o.tableId);
    } else {
      router.push('/staff/orders');
    }
  }, []);

  const loadTableOrders = async (tableId: string) => {
    if (!tableId) return;
    try {
      const orders = await api(`/orders/table/${tableId}`);
      setAllOrders(orders);
      const items = orders.flatMap((o: Order) => o.items || []);
      setAllItems(items);
    } catch {
      if (order?.items) setAllItems(order.items);
    }
  };

  const subtotal = allItems.length > 0
    ? allItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    : order ? (order.subtotal || order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)) : 0;
  const discount = Math.round(subtotal * discountPercent / 100);
  const total = subtotal - discount;
  const cashNum = parseInt(cashReceived.replace(/\D/g, '') || '0');
  const change = cashNum - total;

  // Always load QR
  useEffect(() => {
    if (!order || total <= 0) return;
    const loadQr = async () => {
      try {
        const storeAuth = localStorage.getItem('store_auth');
        const storeId = storeAuth ? JSON.parse(storeAuth).store.id : 'store-001';
        const data = await api(`/payments/qr?amount=${total}&table=${order.table?.name || ''}&storeId=${storeId}`);
        setQrData(data);
      } catch {}
    };
    loadQr();
  }, [total, order]);

  const handlePayment = async () => {
    if (!order) return;
    setProcessing(true);
    setError('');
    try {
      const ordersToProcess = allOrders.length > 0
        ? allOrders.filter((o) => o.status !== 'paid' && o.status !== 'cancelled')
        : [order];

      for (const o of ordersToProcess) {
        await api(`/payments/process/${o.id}`, {
          method: 'POST',
          body: {
            method,
            discount: Math.round((o.subtotal || o.total) * discountPercent / 100),
            received: method === 'cash' ? cashNum : undefined,
          },
        });
      }

      setPaymentResult({ total, method, received: cashNum, change });
      setPaid(true);
      localStorage.removeItem('payment_order');
    } catch (err: any) {
      setError(err.message || 'Lỗi thanh toán');
    }
    setProcessing(false);
  };

  const printBill = () => {
    if (!order) return;
    const tableName = order.table?.name || '—';
    const now = new Date();
    const timeStr = now.toLocaleString('vi-VN');
    const itemsHtml = allItems.map((item) =>
      `<tr><td style="padding:3px 0">${item.quantity}x ${item.menuItem?.name || '—'}</td><td style="text-align:right;padding:3px 0">${formatVND(item.unitPrice * item.quantity)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bill ${tableName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:280px;margin:0 auto;padding:16px}
.center{text-align:center}.bold{font-weight:bold}.big{font-size:16px}.sep{border-top:1px dashed #000;margin:8px 0}
table{width:100%;border-collapse:collapse}.right{text-align:right}.total-row{font-size:14px;font-weight:bold}
.qr-section{text-align:center;margin:12px 0}.qr-section img{width:160px;height:auto}
.footer{text-align:center;margin-top:12px;font-size:11px;color:#666}
@media print{.no-print{display:none}body{padding:0;width:100%}}</style></head>
<body>
<div class="center bold big">Nam Thắng Beer & Food</div>
<div class="center" style="font-size:11px;margin-top:4px">123 Nguyễn Huệ, Q.1, TP.HCM<br>ĐT: 0901234567</div>
<div class="sep"></div>
<div class="center bold" style="font-size:14px;margin:8px 0">HÓA ĐƠN THANH TOÁN</div>
<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>Bàn: <b>${tableName}</b></span><span>${timeStr}</span></div>
<div class="sep"></div>
<table>${itemsHtml}</table>
<div class="sep"></div>
<table>
<tr><td>Tạm tính</td><td class="right">${formatVND(subtotal)}</td></tr>
${discount > 0 ? `<tr><td>Giảm giá (${discountPercent}%)</td><td class="right" style="color:green">-${formatVND(discount)}</td></tr>` : ''}
<tr class="total-row"><td style="padding-top:6px">TỔNG CỘNG</td><td class="right" style="padding-top:6px">${formatVND(total)}</td></tr>
</table>
${qrData ? `<div class="qr-section"><div class="sep"></div><p style="font-size:11px;margin-bottom:6px;font-weight:bold">Quét QR để thanh toán</p><img src="${qrData.qrUrl}" alt="VietQR"/><p style="font-size:10px;margin-top:4px">${qrData.accountName || ''}<br>STK: ${qrData.accountNumber || ''}</p></div>` : ''}
<div class="sep"></div>
<div class="footer">Cảm ơn quý khách! 🍺<br>Hẹn gặp lại</div>
<div class="no-print" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:10px 24px;background:#f97316;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer">🖨️ In bill</button></div>
</body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // Loading
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ===== Success =====
  if (paid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fadeInUp">
        <div className="text-center w-full max-w-[340px]">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounceIn">✅</div>
          <h2 className="text-xl font-bold mb-1">Thanh toán thành công!</h2>
          <p className="text-gray-400 text-sm">Bàn {order.table?.name || '—'} · {formatVND(total)}</p>
          {method === 'cash' && change > 0 && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
              <span className="text-green-400 text-sm font-semibold">Tiền thối: {formatVND(change)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={printBill} className="py-3.5 bg-dark-600 border border-dark-400 rounded-xl text-sm font-semibold text-gray-300 active:scale-95 transition-transform">
              🖨️ In bill
            </button>
            <Link href="/staff/orders" className="py-3.5 bg-orange-500 rounded-xl text-sm font-semibold text-white text-center active:scale-95 transition-transform">
              Hoàn tất →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== Main Payment UI =====
  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-3 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff/orders" className="text-lg">←</Link>
          <div>
            <h1 className="text-sm font-semibold">Thanh toán</h1>
            <span className="text-[10px] text-gray-500">{allItems.length} món · {allOrders.length} đơn</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={printBill} className="bg-dark-500 border border-dark-400 px-3 py-1.5 rounded-lg text-xs text-gray-300 active:scale-95 transition-transform">
            🖨️ In bill
          </button>
          <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg">
            {order.table?.name || '—'}
          </span>
        </div>
      </header>

      {/* Bill + QR side by side on larger screens */}
      <div className="px-4 mt-4 space-y-4">

        {/* QR Payment - Only show when QR method selected */}
        {qrData && method === 'qr_transfer' && (
          <div className="bg-dark-600 rounded-2xl p-4 border border-dark-400 animate-fadeInUp">
            <div className="flex items-start gap-4">
              <div className="bg-white rounded-xl p-2 flex-shrink-0">
                <img src={qrData.qrUrl} alt="VietQR" className="w-28 h-28" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">Quét QR thanh toán</h3>
                <p className="text-xl font-bold text-orange-500">{formatVND(total)}</p>
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs text-gray-300">{qrData.accountName}</p>
                  <p className="text-[11px] text-gray-500">STK: {qrData.accountNumber}</p>
                  <p className="text-[10px] text-gray-600">ND: {qrData.content}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bill Detail */}
        <div className="bg-dark-600 rounded-2xl p-4 border border-dark-400">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-dark-400">
            <h3 className="text-sm font-semibold">🧾 Chi tiết hóa đơn</h3>
            <span className="text-[11px] text-gray-500">Bàn {order.table?.name || '—'}</span>
          </div>

          {/* Items */}
          <div className="max-h-48 overflow-y-auto space-y-0">
            {allItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-dark-500 last:border-0">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-200">{item.menuItem?.name || '—'}</span>
                  {item.note && <span className="text-[9px] text-yellow-500 ml-1">📝</span>}
                </div>
                <span className="text-[11px] text-orange-500 font-semibold mx-2">x{item.quantity}</span>
                <span className="text-xs text-gray-300 w-20 text-right">{formatVND(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-dark-400 mt-3 pt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Tạm tính ({allItems.length} món)</span>
              <span>{formatVND(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-green-400 mb-1">
                <span>Giảm giá ({discountPercent}%)</span>
                <span>-{formatVND(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 mt-1 border-t border-dark-400">
              <span className="text-sm font-bold">Tổng thanh toán</span>
              <span className="text-xl font-bold text-orange-500">{formatVND(total)}</span>
            </div>
          </div>
        </div>

        {/* Discount */}
        <div className="bg-dark-600 rounded-2xl p-4 border border-dark-400">
          <h3 className="text-xs font-semibold mb-3 text-gray-400 uppercase">Giảm giá</h3>
          <div className="flex gap-1.5">
            {[0, 5, 10, 15, 20, 30].map((pct) => (
              <button
                key={pct}
                onClick={() => setDiscountPercent(pct)}
                className={cn('flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all', discountPercent === pct ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-dark-400 text-gray-500')}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-dark-600 rounded-2xl p-4 border border-dark-400">
          <h3 className="text-xs font-semibold mb-3 text-gray-400 uppercase">Phương thức thanh toán</h3>
          <div className="grid grid-cols-4 gap-2">
            {([
              { key: 'cash', icon: '💵', label: 'Tiền mặt' },
              { key: 'qr_transfer', icon: '📱', label: 'QR Bank' },
              { key: 'card', icon: '💳', label: 'Thẻ' },
              { key: 'mixed', icon: '🔀', label: 'Hỗn hợp' },
            ] as const).map((pm) => (
              <button
                key={pm.key}
                onClick={() => setMethod(pm.key)}
                className={cn('p-3 rounded-xl border text-center transition-all active:scale-95', method === pm.key ? 'border-orange-500 bg-orange-500/10' : 'border-dark-400 bg-dark-500')}
              >
                <div className="text-xl mb-1">{pm.icon}</div>
                <div className={cn('text-[10px] leading-tight', method === pm.key ? 'text-orange-500 font-semibold' : 'text-gray-400')}>{pm.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cash Input */}
        {method === 'cash' && (
          <div className="bg-dark-600 rounded-2xl p-4 border border-dark-400">
            <h3 className="text-xs font-semibold mb-3 text-gray-400 uppercase">Khách đưa</h3>
            <input
              type="text"
              value={cashReceived ? formatVND(cashNum).replace('đ', '') : ''}
              onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))}
              placeholder={formatVND(total)}
              className="w-full bg-dark-500 border border-dark-400 rounded-xl px-4 py-3.5 text-white text-xl font-bold text-right outline-none focus:border-orange-500 transition-colors"
            />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[total, Math.ceil(total / 100000) * 100000, Math.ceil(total / 500000) * 500000, 1000000, 2000000, 5000000]
                .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
                .slice(0, 6)
                .map((preset) => (
                  <button key={preset} onClick={() => setCashReceived(preset.toString())} className="py-2.5 bg-dark-500 border border-dark-400 rounded-lg text-[11px] text-gray-400 active:border-orange-500 active:text-orange-500 transition-colors">
                    {formatVND(preset)}
                  </button>
                ))}
            </div>
            {cashNum >= total && cashNum > 0 && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex justify-between items-center">
                <span className="text-sm text-green-400">Tiền thối</span>
                <span className="text-lg text-green-400 font-bold">{formatVND(change)}</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center">{error}</div>
        )}
      </div>

      {/* Bottom Fixed Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-800 border-t border-dark-400 p-4 space-y-2">
        <button
          onClick={handlePayment}
          disabled={processing || (method === 'cash' && cashNum < total)}
          className="w-full py-4 bg-green-500 rounded-xl text-base font-bold text-white disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {processing ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang xử lý...</>
          ) : (
            <>✓ Xác nhận thanh toán · {formatVND(total)}</>
          )}
        </button>
      </div>
    </div>
  );
}
