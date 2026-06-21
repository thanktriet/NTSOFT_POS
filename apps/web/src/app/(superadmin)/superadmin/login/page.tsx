'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Super Admin credentials (hardcoded for now, move to env/DB later)
const SUPER_ADMIN = {
  email: 'admin@ntsoft.vn',
  password: 'ntsoft@2026',
};

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');

    // Simple auth check (production: move to API with bcrypt)
    if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
      localStorage.setItem('superadmin', JSON.stringify({
        email,
        role: 'superadmin',
        loginAt: new Date().toISOString(),
      }));
      router.push('/superadmin');
    } else {
      setError('Email hoặc mật khẩu không đúng');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-400 rounded-2xl flex items-center justify-center text-xl font-extrabold mx-auto mb-4">
            NT
          </div>
          <h1 className="text-xl font-bold">NTSOFT Platform</h1>
          <p className="text-gray-500 text-sm mt-1">Super Admin Panel</p>
        </div>

        {/* Form */}
        <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="admin@ntsoft.vn"
              className="w-full bg-dark-600 border border-dark-400 rounded-xl px-4 py-3.5 text-white outline-none focus:border-blue-500 placeholder:text-gray-600 transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-dark-600 border border-dark-400 rounded-xl px-4 py-3.5 text-white outline-none focus:border-blue-500 placeholder:text-gray-600 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-400 text-center animate-fadeIn">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? '⏳ Đang xác thực...' : 'Đăng nhập →'}
          </button>
        </div>

        <p className="text-[10px] text-gray-700 text-center mt-8">
          © 2026 NTSOFT · Platform Management
        </p>
      </div>
    </div>
  );
}
