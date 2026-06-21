'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STORE_ID = 'store-001';

interface Staff {
  id: string;
  name: string;
  phone?: string;
  role: 'owner' | 'manager' | 'staff' | 'kitchen';
  isActive: boolean;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner: { label: 'Chủ quán', color: 'bg-purple-500' },
  manager: { label: 'Quản lý', color: 'bg-blue-500' },
  staff: { label: 'Phục vụ', color: 'bg-green-500' },
  kitchen: { label: 'Bếp', color: 'bg-orange-500' },
};

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetPinId, setResetPinId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({ name: '', phone: '', pin: '', role: 'staff' as string });
  const [newPin, setNewPin] = useState('');

  useEffect(() => { loadStaff(); }, []);

  const token = () => localStorage.getItem('token') || '';

  const loadStaff = async () => {
    try {
      const data = await api(`/staff?storeId=${STORE_ID}`, { token: token() });
      setStaffList(data);
    } catch { setMessage('Lỗi tải danh sách nhân viên'); }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name || !form.pin) return;
    setSaving(true);
    try {
      await api('/staff', {
        method: 'POST',
        token: token(),
        body: { storeId: STORE_ID, name: form.name, pin: form.pin, phone: form.phone || undefined, role: form.role },
      });
      setShowAdd(false);
      setForm({ name: '', phone: '', pin: '', role: 'staff' });
      setMessage('Đã thêm nhân viên!');
      loadStaff();
    } catch (err: any) { setMessage(err.message || 'Lỗi'); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name) return;
    setSaving(true);
    try {
      await api(`/staff/${editingId}`, {
        method: 'PUT',
        token: token(),
        body: { name: form.name, phone: form.phone || undefined, role: form.role },
      });
      setEditingId(null);
      setMessage('Đã cập nhật!');
      loadStaff();
    } catch (err: any) { setMessage(err.message || 'Lỗi'); }
    setSaving(false);
  };

  const handleToggle = async (id: string) => {
    try {
      await api(`/staff/${id}/toggle`, { method: 'PUT', token: token() });
      loadStaff();
    } catch {}
  };

  const handleResetPin = async () => {
    if (!resetPinId || !newPin) return;
    setSaving(true);
    try {
      await api(`/staff/${resetPinId}/reset-pin`, {
        method: 'PUT',
        token: token(),
        body: { newPin },
      });
      setResetPinId(null);
      setNewPin('');
      setMessage('Đã đặt lại PIN!');
    } catch (err: any) { setMessage(err.message || 'Lỗi'); }
    setSaving(false);
  };

  const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone || '', pin: '', role: s.role });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff/account" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Nhân viên</h1>
          <span className="text-xs text-gray-500">{staffList.length} người</span>
        </div>
        <button onClick={() => { setShowAdd(true); setForm({ name: '', phone: '', pin: '', role: 'staff' }); }} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
          + Thêm
        </button>
      </header>

      {message && (
        <div className="mx-4 mt-3 p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400 text-center animate-fadeIn">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-green-600">✕</button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-2 stagger-children">
        {staffList.map((s) => {
          const roleInfo = ROLE_LABELS[s.role];
          return (
            <div key={s.id} className={cn('bg-dark-600 rounded-xl p-4 border border-dark-400 press-card', !s.isActive && 'opacity-50')}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-dark-500 rounded-full flex items-center justify-center text-base font-bold">
                  {s.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{s.name}</span>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full text-white font-semibold', roleInfo.color)}>
                      {roleInfo.label}
                    </span>
                  </div>
                  {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(s.id)} className={cn('w-9 h-5 rounded-full relative transition-colors', s.isActive ? 'bg-green-500' : 'bg-dark-400')}>
                    <div className={cn('w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all', s.isActive ? 'left-[18px]' : 'left-[3px]')}></div>
                  </button>
                  <button onClick={() => startEdit(s)} className="w-8 h-8 bg-dark-500 rounded-lg flex items-center justify-center text-xs">✏️</button>
                  <button onClick={() => setResetPinId(s.id)} className="w-8 h-8 bg-dark-500 rounded-lg flex items-center justify-center text-xs">🔑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Thêm nhân viên" onClose={() => setShowAdd(false)}>
          <StaffForm form={form} setForm={setForm} showPin onSubmit={handleAdd} saving={saving} submitLabel="Thêm" />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingId && (
        <Modal title="Sửa nhân viên" onClose={() => setEditingId(null)}>
          <StaffForm form={form} setForm={setForm} showPin={false} onSubmit={handleUpdate} saving={saving} submitLabel="Cập nhật" />
        </Modal>
      )}

      {/* Reset PIN Modal */}
      {resetPinId && (
        <Modal title="Đặt lại PIN" onClose={() => setResetPinId(null)}>
          <div className="space-y-3">
            <p className="text-xs text-gray-400">Nhập PIN mới (4-6 số) cho nhân viên</p>
            <input
              type="number"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.slice(0, 6))}
              placeholder="VD: 1234"
              className="input w-full text-center text-lg tracking-widest"
              maxLength={6}
            />
            <button onClick={handleResetPin} disabled={saving || newPin.length < 4} className="btn-primary w-full disabled:opacity-50">
              {saving ? '⏳...' : '✓ Đặt lại PIN'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-[390px] mx-auto bg-dark-700 rounded-t-2xl p-5 animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StaffForm({ form, setForm, showPin, onSubmit, saving, submitLabel }: {
  form: { name: string; phone: string; pin: string; role: string };
  setForm: (f: any) => void;
  showPin: boolean;
  onSubmit: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Tên *</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" className="input w-full" />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">SĐT</label>
        <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" className="input w-full" />
      </div>
      {showPin && (
        <div>
          <label className="text-xs text-gray-400 mb-1 block">PIN (4-6 số) *</label>
          <input type="number" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.slice(0, 6) })} placeholder="1234" className="input w-full text-center tracking-widest" />
        </div>
      )}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Vai trò</label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { key: 'staff', label: 'Phục vụ' },
            { key: 'kitchen', label: 'Bếp' },
            { key: 'manager', label: 'Quản lý' },
            { key: 'owner', label: 'Chủ quán' },
          ].map((r) => (
            <button key={r.key} onClick={() => setForm({ ...form, role: r.key })} className={cn('py-2 rounded-lg text-[11px] font-medium border', form.role === r.key ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-dark-400 text-gray-500')}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onSubmit} disabled={saving || !form.name || (showPin && form.pin.length < 4)} className="btn-primary w-full disabled:opacity-50">
        {saving ? '⏳...' : `✓ ${submitLabel}`}
      </button>
    </div>
  );
}
