'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function StaffLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleLogin = async (pinCode: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: { storeId: 'store-001', pin: pinCode },
      });

      // Save token + staff info
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-400 rounded-2xl flex items-center justify-center text-xl font-extrabold mx-auto mb-4">
          NT
        </div>
        <h1 className="text-xl font-bold">NTSOFT POS</h1>
        <p className="text-gray-500 text-sm">Hệ thống quản lý nhà hàng</p>
      </div>

      {/* PIN dots */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 text-center mb-3">Nhập mã PIN</p>
        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-11 h-11 rounded-lg border flex items-center justify-center text-lg font-bold transition-all ${
                i < pin.length
                  ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                  : 'border-dark-400 bg-dark-600'
              }`}
            >
              {i < pin.length ? '●' : ''}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-400 text-center mt-3">{error}</p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center mt-3">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(
          (key) => (
            <button
              key={key}
              onClick={() => {
                if (key === '⌫') handleDelete();
                else if (key !== '') handlePinInput(key);
              }}
              disabled={key === '' || loading}
              className={`h-14 rounded-lg text-lg font-semibold transition-all ${
                key === ''
                  ? 'invisible'
                  : key === '⌫'
                  ? 'bg-dark-600 border border-dark-400 text-red-400 active:bg-dark-500'
                  : 'bg-dark-600 border border-dark-400 text-white active:bg-primary-500 active:border-primary-500'
              } disabled:opacity-50`}
            >
              {key}
            </button>
          ),
        )}
      </div>

      {/* Quick login hints */}
      <div className="mt-8">
        <p className="text-xs text-gray-600 text-center mb-3">Đăng nhập nhanh</p>
        <div className="flex gap-3 justify-center">
          {[
            { name: 'Nam', pin: '1234' },
            { name: 'Hoa', pin: '2345' },
            { name: 'Tài', pin: '3456' },
            { name: 'Minh', pin: '4567' },
          ].map((staff) => (
            <button
              key={staff.name}
              onClick={() => {
                setPin('');
                setTimeout(() => {
                  setPin(staff.pin);
                  handleLogin(staff.pin);
                }, 100);
              }}
              disabled={loading}
              className="flex flex-col items-center gap-1 disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-dark-600 border-2 border-dark-400 flex items-center justify-center text-sm hover:border-primary-500 transition-colors">
                {staff.name[0]}
              </div>
              <span className="text-[10px] text-gray-500">{staff.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
