'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatVND, cn } from '@/lib/utils';

const STORE_ID = 'store-001';

interface MenuOption {
  id: string;
  groupName: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  prepTime?: number;
  isAvailable: boolean;
  sortOrder: number;
  options: MenuOption[];
}

interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  items: MenuItem[];
}

export default function MenuManagementPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [itemForm, setItemForm] = useState({ name: '', price: '', description: '', prepTime: '' });
  const [catForm, setCatForm] = useState({ name: '', icon: '' });

  useEffect(() => { loadMenu(); }, []);

  const loadMenu = async () => {
    try {
      const data = await api(`/menu/store/${STORE_ID}`);
      setCategories(data);
      if (data.length > 0 && !activeCategory) setActiveCategory(data[0].id);
    } catch {
      setMessage('Lỗi tải menu');
    } finally {
      setLoading(false);
    }
  };

  const token = () => localStorage.getItem('token') || '';

  // ===== Category Actions =====
  const handleAddCategory = async () => {
    if (!catForm.name) return;
    setSaving(true);
    try {
      await api('/menu/categories', {
        method: 'POST',
        token: token(),
        body: { storeId: STORE_ID, name: catForm.name, icon: catForm.icon || '📋' },
      });
      setCatForm({ name: '', icon: '' });
      setShowAddCategory(false);
      setMessage('Đã thêm danh mục!');
      loadMenu();
    } catch { setMessage('Lỗi thêm danh mục'); }
    setSaving(false);
  };

  // ===== Item Actions =====
  const handleAddItem = async () => {
    if (!itemForm.name || !itemForm.price) return;
    setSaving(true);
    try {
      await api('/menu/items', {
        method: 'POST',
        token: token(),
        body: {
          categoryId: activeCategory,
          name: itemForm.name,
          price: parseInt(itemForm.price),
          description: itemForm.description || undefined,
          prepTime: itemForm.prepTime ? parseInt(itemForm.prepTime) : undefined,
        },
      });
      setItemForm({ name: '', price: '', description: '', prepTime: '' });
      setShowAddItem(false);
      setMessage('Đã thêm món!');
      loadMenu();
    } catch { setMessage('Lỗi thêm món'); }
    setSaving(false);
  };

  const handleToggleItem = async (itemId: string) => {
    try {
      await api(`/menu/items/${itemId}/toggle`, { method: 'PUT', token: token() });
      loadMenu();
    } catch { setMessage('Lỗi cập nhật'); }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await api(`/menu/items/${editingItem.id}`, {
        method: 'PUT',
        token: token(),
        body: {
          name: itemForm.name,
          price: parseInt(itemForm.price),
          description: itemForm.description || undefined,
          prepTime: itemForm.prepTime ? parseInt(itemForm.prepTime) : undefined,
        },
      });
      setEditingItem(null);
      setMessage('Đã cập nhật!');
      loadMenu();
    } catch { setMessage('Lỗi cập nhật'); }
    setSaving(false);
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      price: item.price.toString(),
      description: item.description || '',
      prepTime: item.prepTime?.toString() || '',
    });
  };

  const activeItems = categories.find((c) => c.id === activeCategory)?.items || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff/account" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">Quản lý Menu</h1>
        </div>
        <button
          onClick={() => setShowAddCategory(true)}
          className="bg-dark-500 border border-dark-400 px-3 py-1.5 rounded-lg text-xs text-gray-300"
        >
          + Danh mục
        </button>
      </header>

      {/* Message */}
      {message && (
        <div className="mx-4 mt-3 p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400 text-center animate-fadeIn">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-green-600">✕</button>
        </div>
      )}

      {/* Categories tabs */}
      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border transition-all',
              activeCategory === cat.id
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-dark-600 border-dark-400 text-gray-400',
            )}
          >
            {cat.icon} {cat.name} ({cat.items.length})
          </button>
        ))}
      </div>

      {/* Add Item Button */}
      <div className="px-4 mb-3">
        <button
          onClick={() => { setShowAddItem(true); setItemForm({ name: '', price: '', description: '', prepTime: '' }); }}
          className="w-full py-3 border-2 border-dashed border-dark-400 rounded-xl text-sm text-gray-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
        >
          + Thêm món mới
        </button>
      </div>

      {/* Items List */}
      <div className="px-4 space-y-2 stagger-children">
        {activeItems.map((item) => (
          <div
            key={item.id}
            className="bg-dark-600 rounded-xl p-3 border border-dark-400 flex items-center gap-3 press-card"
          >
            <div className="w-12 h-12 bg-dark-500 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
              🍽️
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('text-sm font-medium truncate', !item.isAvailable && 'line-through text-gray-500')}>
                {item.name}
              </div>
              <div className="text-xs text-orange-500 font-semibold">{formatVND(item.price)}</div>
              {item.prepTime && <div className="text-[10px] text-gray-500">⏱ {item.prepTime} phút</div>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Toggle available */}
              <button
                onClick={() => handleToggleItem(item.id)}
                className={cn(
                  'w-10 h-5 rounded-full relative transition-colors',
                  item.isAvailable ? 'bg-green-500' : 'bg-dark-400',
                )}
              >
                <div className={cn(
                  'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all',
                  item.isAvailable ? 'left-5.5 left-[22px]' : 'left-0.5',
                )}></div>
              </button>
              {/* Edit */}
              <button
                onClick={() => startEdit(item)}
                className="w-8 h-8 bg-dark-500 rounded-lg flex items-center justify-center text-xs"
              >
                ✏️
              </button>
            </div>
          </div>
        ))}

        {activeItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-3xl">📋</span>
            <p className="text-sm mt-2">Chưa có món nào trong danh mục này</p>
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <Modal title="Thêm danh mục" onClose={() => setShowAddCategory(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tên danh mục</label>
              <input
                type="text"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="VD: Hải sản, Lẩu, Nước..."
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Icon (emoji)</label>
              <div className="flex gap-2">
                {['🍖', '🍺', '🍢', '🦐', '🍲', '🥤', '🍰', '📋'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setCatForm({ ...catForm, icon: emoji })}
                    className={cn(
                      'w-9 h-9 rounded-lg text-lg flex items-center justify-center border',
                      catForm.icon === emoji ? 'border-orange-500 bg-orange-500/10' : 'border-dark-400',
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAddCategory}
              disabled={saving || !catForm.name}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? '⏳ Đang lưu...' : '✓ Thêm danh mục'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <Modal title="Thêm món mới" onClose={() => setShowAddItem(false)}>
          <ItemForm
            form={itemForm}
            setForm={setItemForm}
            onSubmit={handleAddItem}
            saving={saving}
            submitLabel="Thêm món"
          />
        </Modal>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <Modal title={`Sửa: ${editingItem.name}`} onClose={() => setEditingItem(null)}>
          <ItemForm
            form={itemForm}
            setForm={setItemForm}
            onSubmit={handleUpdateItem}
            saving={saving}
            submitLabel="Cập nhật"
          />
        </Modal>
      )}
    </div>
  );
}

// ===== Modal =====
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-[390px] mx-auto bg-dark-700 rounded-t-2xl p-5 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ===== Item Form =====
function ItemForm({ form, setForm, onSubmit, saving, submitLabel }: {
  form: { name: string; price: string; description: string; prepTime: string };
  setForm: (f: any) => void;
  onSubmit: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Tên món *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="VD: Bò nướng tảng"
          className="input w-full"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Giá (VNĐ) *</label>
        <input
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="VD: 250000"
          className="input w-full"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Mô tả</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="VD: Bò Úc nướng than hoa..."
          className="input w-full"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Thời gian chế biến (phút)</label>
        <input
          type="number"
          value={form.prepTime}
          onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
          placeholder="VD: 15"
          className="input w-full"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={saving || !form.name || !form.price}
        className="btn-primary w-full disabled:opacity-50"
      >
        {saving ? '⏳ Đang lưu...' : `✓ ${submitLabel}`}
      </button>
    </div>
  );
}
