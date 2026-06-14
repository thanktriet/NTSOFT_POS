'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cart.store';
import { createOrder } from '@/lib/api';
import { formatVND } from '@/lib/utils';

export default function CartPage({
  params,
}: {
  params: { storeId: string; tableId: string };
}) {
  const { storeId, tableId } = params;
  const router = useRouter();
  const cart = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalItems = cart.totalItems();
  const totalAmount = cart.totalAmount();

  const handleSubmitOrder = async () => {
    if (cart.items.length === 0) return;

    setSubmitting(true);
    setError('');

    try {
      const orderData = {
        storeId,
        tableId,
        source: 'qr' as const,
        items: cart.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          note: item.note || undefined,
          options: item.options.length > 0 ? item.options : undefined,
        })),
      };

      await createOrder(orderData);
      cart.clearCart();
      router.push(`/order/${storeId}/${tableId}/tracking`);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi đơn hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <span className="text-5xl mb-4">🛒</span>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Giỏ hàng trống</h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Chưa có món nào. Quay lại menu để chọn món nhé!
        </p>
        <Link
          href={`/order/${storeId}/${tableId}`}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-semibold"
        >
          ← Xem menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <Link href={`/order/${storeId}/${tableId}`} className="text-xl">←</Link>
        <h1 className="text-base font-semibold text-gray-900">Giỏ hàng</h1>
        <span className="text-xs text-gray-400 ml-auto">{totalItems} món</span>
      </header>

      {/* Table Info */}
      <div className="mx-4 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
        <span className="text-lg">🪑</span>
        <span className="text-sm text-orange-800 font-medium">
          Bàn {tableId} · Nam Thắng Beer & Food
        </span>
      </div>

      {/* Cart Items */}
      <div className="px-4 mt-3 space-y-3">
        {cart.items.map((item, idx) => (
          <div key={`${item.menuItemId}-${idx}`} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                🍽️
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                {item.options.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.options.map((o) => o.name).join(' · ')}
                  </p>
                )}
                {item.note && (
                  <span className="inline-block mt-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                    📝 {item.note}
                  </span>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-orange-500">
                    {formatVND(item.price * item.quantity)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cart.updateQuantity(item.menuItemId, item.quantity - 1)}
                      className="w-7 h-7 border border-gray-200 rounded-md flex items-center justify-center text-sm"
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => cart.updateQuantity(item.menuItemId, item.quantity + 1)}
                      className="w-7 h-7 border border-gray-200 rounded-md flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between text-sm text-gray-500 py-1">
          <span>Tạm tính ({totalItems} món)</span>
          <span>{formatVND(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500 py-1">
          <span>Giảm giá</span>
          <span className="text-green-500">-0đ</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 mt-2 border-t border-gray-100">
          <span>Tổng cộng</span>
          <span className="text-orange-500">{formatVND(totalAmount)}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-100">
        <div className="max-w-[390px] mx-auto">
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full bg-orange-500 text-white py-4 rounded-xl text-base font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Đang gửi...
              </>
            ) : (
              <>Gửi order đến bếp →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
