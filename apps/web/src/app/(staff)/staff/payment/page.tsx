'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatVND, cn } from '@/lib/utils';

type PaymentMethod = 'cash' | 'qr_transfer' | 'momo' | 'card' | 'mixed';

interface BillItem {
  name: string;
  qty: number;
  price: number;
}

const MOCK_BILL: BillItem[] = [
  { name: 'Bò nướng tảng (L)', qty: 2, price: 350000 },
  { name: 'Mực nướng muối ớt', qty: 1, price: 250000 },
  { name: 'Tiger Bạc', qty: 6, price: 25000 },
  { name: 'Cánh gà chiên mắm', qty: 1, price: 155000 },
];

export default function StaffPaymentPage() {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  const subtotal = MOCK_BILL.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Math.round(subtotal * discountPercent / 100);
  const total = subtotal - discount;
  const change = cashReceived ? parseInt(cashReceived.replace(/\D/g, '')) - total : 0;

  const handlePayment = async () => {
    setProcessing(true);
    // TODO: call API
    await new Promise((r) => setTimeout(r, 1000));
    setPaid(true);
    setProcessing(false);
  };

  if (paid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
            ✅
          </div>
          <h2 className="text-xl font-bold mb-2">Thanh toán thành công!</h2>
          <p className="text-gray-400 text-sm mb-2">Bàn A05 · {formatVND(total)}</p>
          <p className="text-gray-500 text-xs mb-6">
            {method === 'cash' && change > 0 ? `Tiền thối: ${formatVND(change)}` : ''}
          </p>
          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-dark-600 border border-dark-400 rounded-xl text-sm font-semibold text-gray-300">
              🖨️ In bill
            </button>
            <Link href="/staff" className="flex-1 py-3 bg-orange-500 rounded-xl text-sm font-semibold text-white text-center">
              Trang chủ →
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
          <Link href="/staff" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Thanh toán</h1>
        </div>
        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">Bàn A05</span>
      </header>

      {/* Bill Detail */}
      <div className="mx-4 mt-4 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-dark-400">
          <h3 className="text-sm font-semibold">Chi tiết hóa đơn</h3>
          <span className="text-[11px] text-gray-500">Mở: 08:15 · 1h20p</span>
        </div>
        {MOCK_BILL.map((item, i) => (
          <div key={i} className="flex justify-between text-xs text-gray-300 py-1.5 border-b border-dark-500 last:border-0">
            <span className="flex-1">{item.name}</span>
            <span className="w-8 text-center text-orange-500 font-semibold">x{item.qty}</span>
            <span className="w-20 text-right">{formatVND(item.price * item.qty)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-dark-400 mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Tạm tính</span>
            <span>{formatVND(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs text-green-400">
              <span>Giảm giá ({discountPercent}%)</span>
              <span>-{formatVND(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Tổng</span>
            <span className="text-orange-500">{formatVND(total)}</span>
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
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-semibold border',
                discountPercent === pct
                  ? 'border-orange-500 text-orange-500 bg-orange-500/10'
                  : 'border-dark-400 text-gray-500',
              )}
            >
              {pct === 0 ? 'Không' : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="mx-4 mt-3 bg-dark-600 rounded-xl p-4 border border-dark-400">
        <h3 className="text-xs font-semibold mb-3">Phương thức thanh toán</h3>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'cash', icon: '💵', label: 'Tiền mặt' },
            { key: 'qr_transfer', icon: '📱', label: 'QR Code' },
            { key: 'card', icon: '💳', label: 'Thẻ' },
            { key: 'mixed', icon: '🔀', label: 'Hỗn hợp' },
          ] as const).map((pm) => (
            <button
              key={pm.key}
              onClick={() => setMethod(pm.key)}
              className={cn(
                'p-3 rounded-xl border text-center transition-all',
                method === pm.key
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-dark-400 bg-dark-500',
              )}
            >
              <div className="text-xl mb-1">{pm.icon}</div>
              <div className={cn('text-[11px]', method === pm.key ? 'text-orange-500 font-semibold' : 'text-gray-400')}>
                {pm.label}
              </div>
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
            onChange={(e) => setCashReceived(e.target.value)}
            placeholder={formatVND(total)}
            className="w-full bg-dark-500 border border-dark-400 rounded-lg px-4 py-3 text-white text-lg font-bold text-right outline-none focus:border-orange-500"
          />
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {[total, Math.ceil(total / 100000) * 100000, Math.ceil(total / 500000) * 500000, 1000000, 2000000].map((preset) => (
              <button
                key={preset}
                onClick={() => setCashReceived(preset.toString())}
                className="py-2 bg-dark-500 border border-dark-400 rounded-lg text-xs text-gray-400 hover:border-orange-500 hover:text-orange-500"
              >
                {formatVND(preset)}
              </button>
            ))}
            <button
              onClick={() => setCashReceived(total.toString())}
              className="py-2 bg-dark-500 border border-dark-400 rounded-lg text-xs text-gray-400 hover:border-orange-500 hover:text-orange-500"
            >
              Đúng tiền
            </button>
          </div>
          {cashReceived && parseInt(cashReceived.replace(/\D/g, '')) >= total && (
            <div className="mt-3 p-3 bg-green-500/10 rounded-lg flex justify-between">
              <span className="text-sm text-green-400">Tiền thối</span>
              <span className="text-sm text-green-400 font-bold">{formatVND(change)}</span>
            </div>
          )}
        </div>
      )}

      {/* QR Display */}
      {method === 'qr_transfer' && (
        <div className="mx-4 mt-3 bg-dark-600 rounded-xl p-4 border border-dark-400 text-center">
          <h3 className="text-xs font-semibold mb-3">QR Thanh toán</h3>
          <div className="w-40 h-40 bg-white rounded-xl mx-auto mb-3 flex items-center justify-center text-dark-900 text-sm">
            [VietQR {formatVND(total)}]
          </div>
          <p className="text-[11px] text-gray-400">VIETCOMBANK · 1234567890</p>
          <p className="text-[11px] text-gray-400">ND: A05 {total}</p>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 p-4 border-t border-dark-400 flex gap-2">
        <button className="py-3.5 px-4 bg-dark-500 rounded-xl text-sm font-semibold text-gray-300">
          🖨️ In bill
        </button>
        <button
          onClick={handlePayment}
          disabled={processing || (method === 'cash' && (!cashReceived || parseInt(cashReceived.replace(/\D/g, '')) < total))}
          className="flex-1 py-3.5 bg-green-500 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
        >
          {processing ? '⏳ Đang xử lý...' : `✓ Xác nhận · ${formatVND(total)}`}
        </button>
      </div>
    </div>
  );
}
