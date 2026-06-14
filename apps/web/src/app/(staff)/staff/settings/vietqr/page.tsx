'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const STORE_ID = 'store-001';

// Danh sách ngân hàng phổ biến (mã VietQR)
const BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VIB', name: 'VIB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'EIB', name: 'Eximbank' },
  { code: 'MSB', name: 'MSB' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'OCB', name: 'OCB' },
  { code: 'VBSP', name: 'Agribank' },
];

interface VietQRConfig {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  template: string;
}

export default function VietQRSettingsPage() {
  const [config, setConfig] = useState<VietQRConfig>({
    bankCode: 'VCB',
    accountNumber: '',
    accountName: '',
    template: 'compact',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewAmount, setPreviewAmount] = useState(850000);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const settings = await api(`/stores/${STORE_ID}/settings`, { token });
      if (settings.vietqr) {
        setConfig(settings.vietqr);
      }
    } catch (err) {
      console.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.accountNumber || !config.accountName) {
      setMessage('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token') || '';
      await api(`/stores/${STORE_ID}/settings`, {
        method: 'PUT',
        token,
        body: { vietqr: config },
      });
      setMessage('Đã lưu cấu hình VietQR thành công!');
    } catch (err) {
      setMessage('Lỗi khi lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const qrPreviewUrl = config.accountNumber
    ? `https://img.vietqr.io/image/${config.bankCode}-${config.accountNumber}-${config.template}.png?amount=${previewAmount}&addInfo=${encodeURIComponent(`A01 ${previewAmount}`)}&accountName=${encodeURIComponent(config.accountName)}`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center gap-3 border-b border-dark-400">
        <Link href="/staff" className="text-xl">←</Link>
        <h1 className="text-base font-semibold">Cấu hình VietQR</h1>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {/* Bank Selection */}
        <div className="bg-dark-600 rounded-xl p-4 border border-dark-400">
          <h3 className="text-sm font-semibold mb-3">🏦 Ngân hàng</h3>
          <select
            value={config.bankCode}
            onChange={(e) => setConfig({ ...config, bankCode: e.target.value })}
            className="w-full bg-dark-500 border border-dark-400 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-500 appearance-none"
          >
            {BANKS.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name} ({bank.code})
              </option>
            ))}
          </select>
        </div>

        {/* Account Info */}
        <div className="bg-dark-600 rounded-xl p-4 border border-dark-400 space-y-3">
          <h3 className="text-sm font-semibold">💳 Thông tin tài khoản</h3>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Số tài khoản</label>
            <input
              type="text"
              value={config.accountNumber}
              onChange={(e) => setConfig({ ...config, accountNumber: e.target.value.replace(/\D/g, '') })}
              placeholder="VD: 1234567890"
              className="w-full bg-dark-500 border border-dark-400 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-500 placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tên chủ tài khoản</label>
            <input
              type="text"
              value={config.accountName}
              onChange={(e) => setConfig({ ...config, accountName: e.target.value.toUpperCase() })}
              placeholder="VD: NGUYEN VAN A"
              className="w-full bg-dark-500 border border-dark-400 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-500 placeholder:text-gray-600 uppercase"
            />
          </div>
        </div>

        {/* Template */}
        <div className="bg-dark-600 rounded-xl p-4 border border-dark-400">
          <h3 className="text-sm font-semibold mb-3">📐 Kiểu QR</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'compact', label: 'Nhỏ gọn' },
              { key: 'compact2', label: 'Có logo' },
              { key: 'qr_only', label: 'QR only' },
            ].map((tpl) => (
              <button
                key={tpl.key}
                onClick={() => setConfig({ ...config, template: tpl.key })}
                className={`py-2.5 rounded-lg text-xs font-medium border transition-all ${
                  config.template === tpl.key
                    ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                    : 'border-dark-400 text-gray-400'
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {config.accountNumber && (
          <div className="bg-dark-600 rounded-xl p-4 border border-dark-400 text-center">
            <h3 className="text-sm font-semibold mb-3">👁️ Xem trước</h3>
            <div className="bg-white rounded-xl p-3 inline-block">
              <img
                src={qrPreviewUrl}
                alt="VietQR Preview"
                className="w-48 h-auto mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {BANKS.find((b) => b.code === config.bankCode)?.name} · {config.accountNumber}
            </p>
            <p className="text-xs text-gray-500">{config.accountName}</p>
            <p className="text-xs text-orange-500 font-semibold mt-1">
              Số tiền test: {previewAmount.toLocaleString('vi-VN')}đ
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-dark-600 rounded-xl p-4 border border-dark-400">
          <h3 className="text-sm font-semibold mb-2">💡 Cách hoạt động</h3>
          <div className="space-y-2 text-xs text-gray-400">
            <p>1. Khi khách yêu cầu thanh toán QR, hệ thống tự tạo mã QR với <strong className="text-white">số tiền + nội dung CK</strong> chính xác.</p>
            <p>2. Nội dung CK format: <strong className="text-white">[Tên bàn] [Số tiền]</strong> (VD: A05 850000)</p>
            <p>3. Nhân viên xác nhận đã nhận tiền sau khi kiểm tra app ngân hàng.</p>
            <p className="text-yellow-400">⚠️ Giai đoạn 2: Tích hợp webhook tự xác nhận (VNPay/MoMo)</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('thành công')
              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !config.accountNumber || !config.accountName}
          className="w-full py-3.5 bg-orange-500 rounded-xl text-sm font-semibold text-white disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {saving ? '⏳ Đang lưu...' : '💾 Lưu cấu hình'}
        </button>
      </div>
    </div>
  );
}
