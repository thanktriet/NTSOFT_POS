'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function ChangePinPage() {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [staffId, setStaffId] = useState('');

  useEffect(() => {
    const staff = localStorage.getItem('staff');
    if (staff) setStaffId(JSON.parse(staff).id);
  }, []);

  const handleDigit = (digit: string) => {
    setError('');
    if (step === 'current' && currentPin.length < 4) {
      const val = currentPin + digit;
      setCurrentPin(val);
      if (val.length === 4) setTimeout(() => setStep('new'), 200);
    } else if (step === 'new' && newPin.length < 4) {
      const val = newPin + digit;
      setNewPin(val);
      if (val.length === 4) setTimeout(() => setStep('confirm'), 200);
    } else if (step === 'confirm' && confirmPin.length < 4) {
      const val = confirmPin + digit;
      setConfirmPin(val);
      if (val.length === 4) {
        setTimeout(() => submitChangePin(val), 200);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'current') setCurrentPin((p) => p.slice(0, -1));
    else if (step === 'new') setNewPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  };

  const submitChangePin = async (confirm: string) => {
    if (newPin !== confirm) {
      setError('PIN xác nhận không khớp');
      setConfirmPin('');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token') || '';
      await api(`/staff/${staffId}/change-pin`, {
        method: 'PUT',
        token,
        body: { currentPin, newPin },
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'PIN hiện tại không đúng');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setStep('current');
    }
    setSaving(false);
  };

  const activePin = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;
  const titles = { current: 'Nhập PIN hiện tại', new: 'Nhập PIN mới', confirm: 'Xác nhận PIN mới' };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center animate-bounceIn">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">Đổi PIN thành công!</h2>
          <p className="text-gray-400 text-sm mb-6">Lần đăng nhập tiếp theo hãy dùng PIN mới.</p>
          <Link href="/staff/account" className="btn-primary inline-block px-6 py-3">← Quay lại</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Header */}
      <div className="absolute top-4 left-4">
        <Link href="/staff/account" className="text-xl text-gray-400">←</Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-lg font-bold mb-1">Đổi mã PIN</h1>
        <p className="text-sm text-gray-400">{titles[step]}</p>

        {/* Step indicator */}
        <div className="flex gap-2 justify-center mt-3">
          {['current', 'new', 'confirm'].map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${
              step === s ? 'bg-orange-500 scale-125' :
              (['current', 'new', 'confirm'].indexOf(step) > i) ? 'bg-green-500' : 'bg-dark-400'
            }`}></div>
          ))}
        </div>
      </div>

      {/* PIN dots */}
      <div className="flex gap-3 justify-center mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-11 h-11 rounded-lg border flex items-center justify-center text-lg font-bold transition-all ${
            i < activePin.length
              ? 'border-orange-500 bg-orange-500/10 text-orange-500 scale-110'
              : 'border-dark-400 bg-dark-600'
          }`}>
            {i < activePin.length ? '●' : ''}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400 mb-4 animate-fadeIn">{error}</p>}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === '⌫') handleDelete();
              else if (key !== '') handleDigit(key);
            }}
            disabled={key === '' || saving}
            className={`h-14 rounded-lg text-lg font-semibold numpad-btn ${
              key === '' ? 'invisible' :
              key === '⌫' ? 'bg-dark-600 border border-dark-400 text-red-400' :
              'bg-dark-600 border border-dark-400 text-white active:bg-orange-500 active:border-orange-500'
            } disabled:opacity-50`}
          >
            {key}
          </button>
        ))}
      </div>

      {saving && (
        <div className="mt-4">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}
    </div>
  );
}
