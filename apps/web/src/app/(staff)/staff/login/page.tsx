'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface StoreInfo {
  id: string;
  name: string;
  address?: string;
  logo?: string;
}

interface StoredKey {
  storeKey: string;
  store: StoreInfo;
  expiresAt: string;
}

export default function StaffLoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'store-key' | 'pin'>('loading');
  const [storeKey, setStoreKey] = useState('');
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStoredKey();
  }, []);

  // Check if sk-key is stored and not expired
  const checkStoredKey = () => {
    const stored = localStorage.getItem('store_auth');
    if (stored) {
      try {
        const data: StoredKey = JSON.parse(stored);
        const expiresAt = new Date(data.expiresAt);

        if (expiresAt > new Date()) {
          // Key still valid
          setStoreInfo(data.store);
          setPhase('pin');
          return;
        } else {
          // Expired — clear and show key input
          localStorage.removeItem('store_auth');
          localStorage.removeItem('token');
          localStorage.removeItem('staff');
        }
      } catch {
        localStorage.removeItem('store_auth');
      }
    }
    setPhase('store-key');
  };

  // Validate sk-key
  const handleValidateKey = async () => {
    if (!storeKey.trim()) return;
    setLoading(true);
    setError('');

    try {
      const result = await api('/auth/validate-key', {
        method: 'POST',
        body: { storeKey: storeKey.trim() },
      });

      // Store key + info in localStorage
      const storedData: StoredKey = {
        storeKey: storeKey.trim(),
        store: result.store,
        expiresAt: result.expiresAt,
      };
      localStorage.setItem('store_auth', JSON.stringify(storedData));

      setStoreInfo(result.store);
      setPhase('pin');
    } catch (err: any) {
      setError(err.message || 'Store key không hợp lệ');
    }
    setLoading(false);
  };

  // PIN input
  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  // Login with PIN
  const handleLogin = async (pinCode: string) => {
    if (!storeInfo) return;
    setLoading(true);
    setError('');

    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: { storeId: storeInfo.id, pin: pinCode },
      });

      localStorage.setItem('token', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('staff', JSON.stringify(result.staff));

      // Redirect based on role
      if (result.staff.role === 'kitchen') {
        router.push('/kds');
      } else if (result.staff.role === 'owner' || result.staff.role === 'manager') {
        router.push('/admin');
      } else {
        router.push('/staff');
      }
    } catch (err: any) {
      setError(err.message || 'PIN không đúng');
      setPin('');
    }
    setLoading(false);
  };

  // Logout store key (switch store)
  const handleSwitchStore = () => {
    localStorage.removeItem('store_auth');
    localStorage.removeItem('token');
    localStorage.removeItem('staff');
    setStoreInfo(null);
    setStoreKey('');
    setPin('');
    setPhase('store-key');
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ===== Phase 1: Store Key Input =====
  if (phase === 'store-key') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-400 rounded-2xl flex items-center justify-center text-xl font-extrabold mx-auto mb-4">
            NT
          </div>
          <h1 className="text-xl font-bold">NTSOFT POS</h1>
          <p className="text-gray-500 text-sm mt-1">Nhập mã cửa hàng để bắt đầu</p>
        </div>

        <div className="w-full max-w-[300px] space-y-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Store Key</label>
            <input
              type="text"
              value={storeKey}
              onChange={(e) => { setStoreKey(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleValidateKey()}
              placeholder="sk-xxxxxxxx"
              className="w-full bg-dark-600 border border-dark-400 rounded-xl px-4 py-4 text-white text-center text-lg font-mono outline-none focus:border-orange-500 placeholder:text-gray-600 transition-colors"
              autoFocus
            />
          </div>

          {error && <p className="text-xs text-red-400 text-center animate-fadeIn">{error}</p>}

          <button
            onClick={handleValidateKey}
            disabled={loading || !storeKey.trim()}
            className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Đang xác thực...
              </span>
            ) : (
              'Kết nối cửa hàng →'
            )}
          </button>

          <p className="text-[11px] text-gray-600 text-center mt-4">
            Mã cửa hàng được cung cấp bởi quản lý.<br/>
            Liên hệ admin nếu chưa có mã.
          </p>
        </div>
      </div>
    );
  }

  // ===== Phase 2: PIN Input =====
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Store info */}
      <div className="text-center mb-8 animate-fadeInUp">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-400 rounded-2xl flex items-center justify-center text-lg font-extrabold mx-auto mb-3">
          NT
        </div>
        <h2 className="text-base font-bold">{storeInfo?.name}</h2>
        {storeInfo?.address && (
          <p className="text-xs text-gray-500 mt-0.5">{storeInfo.address}</p>
        )}
      </div>

      {/* PIN dots */}
      <div className="mb-6 animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
        <p className="text-xs text-gray-400 text-center mb-3">Nhập mã PIN</p>
        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-11 h-11 rounded-lg border flex items-center justify-center text-lg font-bold transition-all ${
                i < pin.length
                  ? 'border-primary-500 bg-primary-500/10 text-primary-500 scale-110'
                  : 'border-dark-400 bg-dark-600'
              }`}
            >
              {i < pin.length ? '●' : ''}
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-400 text-center mt-3 animate-fadeIn">{error}</p>}

        {loading && (
          <div className="flex justify-center mt-3">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === '⌫') handleDelete();
              else if (key !== '') handlePinInput(key);
            }}
            disabled={key === '' || loading}
            className={`h-14 rounded-lg text-lg font-semibold numpad-btn ${
              key === '' ? 'invisible' :
              key === '⌫' ? 'bg-dark-600 border border-dark-400 text-red-400' :
              'bg-dark-600 border border-dark-400 text-white active:bg-primary-500 active:border-primary-500'
            } disabled:opacity-50`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Switch store */}
      <button
        onClick={handleSwitchStore}
        className="mt-8 text-xs text-gray-600 hover:text-orange-500 transition-colors"
      >
        🔄 Đổi cửa hàng
      </button>
    </div>
  );
}
