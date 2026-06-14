'use client';

import { useState } from 'react';

export default function StaffLoginPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    // TODO: call API
    console.log('Login with PIN:', pin);
    setLoading(false);
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
              className={`w-11 h-11 rounded-lg border flex items-center justify-center text-lg font-bold ${
                i < pin.length
                  ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                  : 'border-dark-400 bg-dark-600'
              }`}
            >
              {i < pin.length ? '●' : ''}
            </div>
          ))}
        </div>
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
              disabled={key === ''}
              className={`h-14 rounded-lg text-lg font-semibold transition-all ${
                key === ''
                  ? 'invisible'
                  : key === '⌫'
                  ? 'bg-dark-600 border border-dark-400 text-red-400 active:bg-dark-500'
                  : 'bg-dark-600 border border-dark-400 text-white active:bg-primary-500 active:border-primary-500'
              }`}
            >
              {key}
            </button>
          ),
        )}
      </div>

      {/* Quick login */}
      <div className="mt-8">
        <p className="text-xs text-gray-600 text-center mb-3">Đăng nhập nhanh</p>
        <div className="flex gap-3 justify-center">
          {['N', 'H', 'T', 'M'].map((name) => (
            <button
              key={name}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-dark-600 border-2 border-dark-400 flex items-center justify-center text-sm hover:border-primary-500 transition-colors">
                {name}
              </div>
              <span className="text-[10px] text-gray-500">{name}am</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
