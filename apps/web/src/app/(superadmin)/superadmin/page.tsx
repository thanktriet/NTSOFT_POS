'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState<Store | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', keyExpireDays: '30' });

  useEffect(() => {
    // Check superadmin auth
    const auth = localStorage.getItem('superadmin');
    if (!auth) {
      router.push('/superadmin/login');
      return;
    }
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const data = await api('/stores');
      setStores(data);
    } catch {
      setStores(MOCK_STORES);
    }
    setLoading(false);
  };

  const generateKey = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `sk-${seg()}-${seg()}-${seg()}`;
  };

  const handleAddStore = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const storeKey = generateKey();
      await api('/stores', {
        method: 'POST',
        body: { name: form.name, address: form.address || undefined, phone: form.phone || undefined, storeKey },
      });
      setShowAdd(false);
      setForm({ name: '', address: '', phone: '', keyExpireDays: '30' });
      setMessage(`✅ Đã tạo! Key: ${storeKey}`);
      loadStores();
    } catch (err: any) { setMessage(`❌ ${err.message}`); }
    setSaving(false);
  };

  const handleExtend = async (store: Store, days: number) => {
    try {
      await api(`/stores/${store.id}`, { method: 'PUT', body: { keyExpireDays: days } });
      setMessage(`✅ ${store.name}: ${days > 0 ? `gia hạn ${days} ngày` : 'đã khóa'}`);
      loadStores();
    } catch {}
  };

  const handleRegenerateKey = async (store: Store) => {
    setSaving(true);
    try {
      const newKey = generateKey();
      await api(`/stores/${store.id}/regenerate-key`, { method: 'PUT', body: { newKey } });
      setMessage(`✅ Key mới: ${newKey}`);
      setShowKeyModal(null);
      loadStores();
    } catch (err: any) { setMessage(`❌ ${err.message}`); }
    setSaving(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('superadmin');
    router.push('/superadmin/login');
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setMessage(`📋 Đã copy: ${key}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-400 rounded-lg flex items-center justify-center text-xs font-extrabold">
                NT
              </div>
              <div>
                <h1 className="text-lg font-bold">NTSOFT Platform</h1>
                <p className="text-xs text-gray-500">Quản lý cửa hàng · {stores.length} quán</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              + Thêm quán
            </button>
            <button onClick={handleLogout} className="bg-dark-600 border border-dark-400 text-gray-400 px-4 py-2 rounded-lg text-sm">
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 p-3 bg-dark-700 border border-dark-400 rounded-lg text-sm font-mono flex items-center justify-between animate-fadeIn">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-gray-600 ml-2">✕</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-dark-700 rounded-xl p-4 border border-dark-400 text-center">
            <div className="text-2xl font-bold text-blue-500">{stores.length}</div>
            <div className="text-xs text-gray-500">Tổng quán</div>
          </div>
          <div className="bg-dark-700 rounded-xl p-4 border border-dark-400 text-center">
            <div className="text-2xl font-bold text-green-500">{stores.filter(isActive).length}</div>
            <div className="text-xs text-gray-500">Đang hoạt động</div>
          </div>
          <div className="bg-dark-700 rounded-xl p-4 border border-dark-400 text-center">
            <div className="text-2xl font-bold text-red-500">{stores.filter((s) => !isActive(s)).length}</div>
            <div className="text-xs text-gray-500">Hết hạn / Khóa</div>
          </div>
        </div>

        {/* Store List */}
        <div className="space-y-3">
          {stores.map((store) => {
            const active = isActive(store);
            const days = getDaysLeft(store);
            return (
              <div key={store.id} className={cn('bg-dark-700 rounded-xl p-5 border transition-all', active ? 'border-dark-400' : 'border-red-500/30 opacity-60')}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold">{store.name}</h3>
                      <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-semibold', active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                        {active ? '● Active' : '● Hết hạn'}
                      </span>
                    </div>
                    {store.address && <p className="text-xs text-gray-500 mt-0.5">{store.address}</p>}
                  </div>
                  <div className="text-right">
                    <div className={cn('text-lg font-bold', days > 7 ? 'text-green-500' : days > 0 ? 'text-yellow-500' : 'text-red-500')}>
                      {days > 0 ? `${days} ngày` : 'Hết hạn'}
                    </div>
                    <div className="text-[10px] text-gray-600">còn lại</div>
                  </div>
                </div>

                {/* Key display */}
                <div className="p-3 bg-dark-800 rounded-lg flex items-center justify-between mb-3">
                  <code className="text-sm font-mono text-orange-400">{store.storeKey}</code>
                  <div className="flex gap-1.5">
                    <button onClick={() => copyKey(store.storeKey)} className="px-2 py-1 bg-dark-600 rounded text-[10px] text-gray-300">📋</button>
                    <button onClick={() => setShowKeyModal(store)} className="px-2 py-1 bg-dark-600 rounded text-[10px] text-gray-300">🔄</button>
                  </div>
                </div>

                {/* Extend */}
                <div className="flex gap-2">
                  <button onClick={() => handleExtend(store, 30)} className="flex-1 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400 font-medium">+30 ngày</button>
                  <button onClick={() => handleExtend(store, 90)} className="flex-1 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400 font-medium">+90 ngày</button>
                  <button onClick={() => handleExtend(store, 365)} className="flex-1 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-400 font-medium">+1 năm</button>
                  <button onClick={() => handleExtend(store, 0)} className="py-2 px-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-medium">Khóa</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Modal */}
        {showAdd && (
          <Modal title="Thêm cửa hàng" onClose={() => setShowAdd(false)}>
            <div className="space-y-3">
              <Input label="Tên cửa hàng *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Quán Bia ABC" />
              <Input label="Địa chỉ" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="123 Đường..." />
              <Input label="SĐT" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0901234567" />
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Thời hạn</label>
                <div className="flex gap-2">
                  {['30', '90', '180', '365'].map((d) => (
                    <button key={d} onClick={() => setForm({ ...form, keyExpireDays: d })} className={cn('flex-1 py-2 rounded-lg text-xs border', form.keyExpireDays === d ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-dark-400 text-gray-500')}>
                      {d === '365' ? '1 năm' : `${d} ngày`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-dark-600 rounded-lg text-xs text-gray-400">
                🔑 SK-Key sẽ tự tạo random. Gửi key cho chủ quán để kết nối.
              </div>
              <button onClick={handleAddStore} disabled={saving || !form.name} className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? '⏳...' : '✓ Tạo + Generate key'}
              </button>
            </div>
          </Modal>
        )}

        {/* Regenerate Key Modal */}
        {showKeyModal && (
          <Modal title="Đổi SK-Key" onClose={() => setShowKeyModal(null)}>
            <div className="space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                ⚠️ Đổi key = tất cả thiết bị phải nhập key mới. Key cũ vô hiệu ngay.
              </div>
              <div className="p-3 bg-dark-600 rounded-lg">
                <div className="text-[10px] text-gray-500">Key hiện tại</div>
                <code className="text-sm font-mono text-gray-400">{showKeyModal.storeKey}</code>
              </div>
              <button onClick={() => handleRegenerateKey(showKeyModal)} disabled={saving} className="w-full py-3 bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
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

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-dark-600 border border-dark-400 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-gray-600 transition-colors" />
    </div>
  );
}

function isActive(store: Store): boolean {
  if (store.keyExpireDays === 0) return false;
  const created = new Date(store.createdAt);
  const expires = new Date(created);
  expires.setDate(expires.getDate() + store.keyExpireDays);
  return expires > new Date();
}

function getDaysLeft(store: Store): number {
  if (store.keyExpireDays === 0) return 0;
  const created = new Date(store.createdAt);
  const expires = new Date(created);
  expires.setDate(expires.getDate() + store.keyExpireDays);
  return Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000));
}

const MOCK_STORES: Store[] = [
  { id: 'store-001', name: 'Nam Thắng Beer & Food', address: '123 Nguyễn Huệ, Q.1', phone: '0901234567', storeKey: 'sk-namthang-001', keyExpireDays: 30, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'store-002', name: 'Quán Bia Sài Gòn', address: '456 Lê Lợi, Q.3', phone: '0912345678', storeKey: 'sk-a1b2-c3d4-e5f6', keyExpireDays: 90, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
];
