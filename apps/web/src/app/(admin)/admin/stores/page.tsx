'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  storeKey: string;
  keyExpireDays: number;
  createdAt: string;
  _count?: { staff: number; tables: number; orders: number };
}

export default function SuperAdminPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showKeyModal, setShowKeyModal] = useState<Store | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    keyExpireDays: '30',
  });

  useEffect(() => { loadStores(); }, []);

  const token = () => localStorage.getItem('token') || '';

  const loadStores = async () => {
    try {
      const data = await api('/stores', { token: token() });
      setStores(data);
    } catch {
      setStores(MOCK_STORES);
    }
    setLoading(false);
  };

  // Generate random sk-key
  const generateKey = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const segments = [
      'sk',
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
    ];
    return segments.join('-');
  };

  const handleAddStore = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const storeKey = generateKey();
      await api('/stores', {
        method: 'POST',
        token: token(),
        body: {
          name: form.name,
          address: form.address || undefined,
          phone: form.phone || undefined,
          storeKey,
        },
      });
      // Update keyExpireDays via settings
      setShowAdd(false);
      setForm({ name: '', address: '', phone: '', keyExpireDays: '30' });
      setMessage(`Đã tạo cửa hàng! Key: ${storeKey}`);
      loadStores();
    } catch (err: any) {
      setMessage(err.message || 'Lỗi tạo cửa hàng');
    }
    setSaving(false);
  };

  const handleRegenerateKey = async (store: Store) => {
    setSaving(true);
    try {
      const newKey = generateKey();
      await api(`/stores/${store.id}/settings`, {
        method: 'PUT',
        token: token(),
        body: { regeneratedKey: newKey },
      });
      // Update storeKey directly
      await api(`/stores/${store.id}/regenerate-key`, {
        method: 'PUT',
        token: token(),
        body: { newKey },
      });
      setMessage(`Key mới: ${newKey}`);
      setShowKeyModal(null);
      loadStores();
    } catch (err: any) {
      setMessage(err.message || 'Lỗi tạo key mới');
    }
    setSaving(false);
  };

  const handleExtend = async (store: Store, days: number) => {
    try {
      await api(`/stores/${store.id}`, {
        method: 'PUT',
        token: token(),
        body: { keyExpireDays: days },
      });
      setMessage(`Đã gia hạn ${store.name}: ${days} ngày`);
      loadStores();
    } catch {}
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setMessage(`Đã copy: ${key}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white p-6">
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">🏢 Quản lý cửa hàng</h1>
            <p className="text-xs text-gray-500 mt-1">Super Admin · Quản lý sk-key và gia hạn</p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setForm({ name: '', address: '', phone: '', keyExpireDays: '30' }); }}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + Thêm cửa hàng
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400 flex items-center justify-between animate-fadeIn">
            <span className="font-mono text-xs">{message}</span>
            <button onClick={() => setMessage('')} className="text-green-600 ml-2">✕</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-dark-700 rounded-xl p-4 border border-dark-400">
            <div className="text-2xl font-bold text-orange-500">{stores.length}</div>
            <div className="text-xs text-gray-500">Cửa hàng</div>
          </div>
          <div className="bg-dark-700 rounded-xl p-4 border border-dark-400">
            <div className="text-2xl font-bold text-green-500">
              {stores.filter((s) => isKeyActive(s)).length}
            </div>
            <div className="text-xs text-gray-500">Đang hoạt động</div>
          </div>
          <div className="bg-dark-700 rounded-xl p-4 border border-dark-400">
            <div className="text-2xl font-bold text-red-500">
              {stores.filter((s) => !isKeyActive(s)).length}
            </div>
            <div className="text-xs text-gray-500">Hết hạn</div>
          </div>
        </div>

        {/* Store List */}
        <div className="space-y-3">
          {stores.map((store) => {
            const active = isKeyActive(store);
            const daysLeft = getDaysLeft(store);

            return (
              <div key={store.id} className={cn(
                'bg-dark-700 rounded-xl p-5 border border-dark-400 transition-all',
                !active && 'opacity-60 border-red-500/30',
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold">{store.name}</h3>
                      <span className={cn(
                        'text-[9px] px-2 py-0.5 rounded-full font-semibold',
                        active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                      )}>
                        {active ? '● Active' : '● Hết hạn'}
                      </span>
                    </div>
                    {store.address && <p className="text-xs text-gray-500">{store.address}</p>}
                    {store.phone && <p className="text-xs text-gray-500">📞 {store.phone}</p>}
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">Còn lại</div>
                    <div className={cn('text-lg font-bold', daysLeft > 7 ? 'text-green-500' : daysLeft > 0 ? 'text-yellow-500' : 'text-red-500')}>
                      {daysLeft > 0 ? `${daysLeft} ngày` : 'Hết hạn'}
                    </div>
                  </div>
                </div>

                {/* Key */}
                <div className="mt-3 p-3 bg-dark-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-500 mb-0.5">Store Key</div>
                    <code className="text-sm font-mono text-orange-400">{store.storeKey}</code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyKey(store.storeKey)}
                      className="px-2 py-1 bg-dark-600 rounded text-[10px] text-gray-300 hover:text-white"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={() => setShowKeyModal(store)}
                      className="px-2 py-1 bg-dark-600 rounded text-[10px] text-gray-300 hover:text-orange-500"
                    >
                      🔄 Đổi key
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleExtend(store, 30)}
                    className="flex-1 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400 font-medium hover:bg-green-500/20"
                  >
                    +30 ngày
                  </button>
                  <button
                    onClick={() => handleExtend(store, 90)}
                    className="flex-1 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400 font-medium hover:bg-blue-500/20"
                  >
                    +90 ngày
                  </button>
                  <button
                    onClick={() => handleExtend(store, 365)}
                    className="flex-1 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-400 font-medium hover:bg-purple-500/20"
                  >
                    +1 năm
                  </button>
                  <button
                    onClick={() => handleExtend(store, 0)}
                    className="py-2 px-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-medium hover:bg-red-500/20"
                  >
                    Khóa
                  </button>
                </div>

                {/* Meta */}
                <div className="mt-3 flex gap-4 text-[10px] text-gray-600">
                  <span>ID: {store.id}</span>
                  <span>Tạo: {new Date(store.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Store Modal */}
        {showAdd && (
          <Modal title="Thêm cửa hàng mới" onClose={() => setShowAdd(false)}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tên cửa hàng *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Quán Bia ABC" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Địa chỉ</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Đường ABC, Q.1" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">SĐT</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Thời hạn (ngày)</label>
                <div className="flex gap-2">
                  {['30', '90', '180', '365'].map((d) => (
                    <button key={d} onClick={() => setForm({ ...form, keyExpireDays: d })} className={cn('flex-1 py-2 rounded-lg text-xs border', form.keyExpireDays === d ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-dark-400 text-gray-500')}>
                      {d === '365' ? '1 năm' : `${d} ngày`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-dark-500 rounded-lg">
                <p className="text-xs text-gray-400">
                  🔑 SK-Key sẽ được tạo tự động (random). Gửi key này cho chủ quán để kết nối app.
                </p>
              </div>

              <button onClick={handleAddStore} disabled={saving || !form.name} className="btn-primary w-full disabled:opacity-50">
                {saving ? '⏳ Đang tạo...' : '✓ Tạo cửa hàng + Generate key'}
              </button>
            </div>
          </Modal>
        )}

        {/* Regenerate Key Modal */}
        {showKeyModal && (
          <Modal title={`Đổi key: ${showKeyModal.name}`} onClose={() => setShowKeyModal(null)}>
            <div className="space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-400">
                  ⚠️ Đổi key sẽ khiến tất cả thiết bị đang dùng key cũ phải nhập lại key mới.
                </p>
              </div>
              <div className="p-3 bg-dark-500 rounded-lg">
                <div className="text-[10px] text-gray-500 mb-1">Key hiện tại</div>
                <code className="text-sm font-mono text-gray-400">{showKeyModal.storeKey}</code>
              </div>
              <div className="p-3 bg-dark-500 rounded-lg">
                <div className="text-[10px] text-gray-500 mb-1">Key mới (preview)</div>
                <code className="text-sm font-mono text-orange-400">{generateKey()}</code>
              </div>
              <button
                onClick={() => handleRegenerateKey(showKeyModal)}
                disabled={saving}
                className="w-full py-3 bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {saving ? '⏳...' : '🔄 Xác nhận đổi key'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-[420px] bg-dark-700 rounded-2xl p-5 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Helpers
function isKeyActive(store: Store): boolean {
  const created = new Date(store.createdAt);
  const expires = new Date(created);
  expires.setDate(expires.getDate() + store.keyExpireDays);
  return expires > new Date() && store.keyExpireDays > 0;
}

function getDaysLeft(store: Store): number {
  if (store.keyExpireDays === 0) return 0;
  const created = new Date(store.createdAt);
  const expires = new Date(created);
  expires.setDate(expires.getDate() + store.keyExpireDays);
  const diff = expires.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Mock
const MOCK_STORES: Store[] = [
  { id: 'store-001', name: 'Nam Thắng Beer & Food', address: '123 Nguyễn Huệ, Q.1', phone: '0901234567', storeKey: 'sk-namthang-001', keyExpireDays: 30, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'store-002', name: 'Quán Bia Sài Gòn', address: '456 Lê Lợi, Q.3', phone: '0912345678', storeKey: 'sk-a1b2-c3d4-e5f6', keyExpireDays: 90, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'store-003', name: 'Nhậu 247', address: '789 Trần Hưng Đạo', phone: '', storeKey: 'sk-x9y8-w7z6-v5u4', keyExpireDays: 0, createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
];
