'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface StaffInfo {
  id: string;
  name: string;
  role: string;
  storeId: string;
}

export default function StaffAccountPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('staff');
    if (stored) {
      setStaff(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('staff');
    router.push('/staff/login');
  };

  const roleLabel: Record<string, string> = {
    owner: 'Chủ quán',
    manager: 'Quản lý',
    staff: 'Phục vụ',
    kitchen: 'Bếp',
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center gap-3 border-b border-dark-400">
        <Link href="/staff" className="text-xl">←</Link>
        <h1 className="text-base font-semibold">Tài khoản</h1>
      </header>

      {/* Profile Card */}
      <div className="mx-4 mt-4 bg-dark-600 rounded-2xl p-6 border border-dark-400 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
          👤
        </div>
        <h2 className="text-lg font-bold">{staff?.name || 'Nhân viên'}</h2>
        <span className="inline-block mt-1 bg-green-500 text-white text-[11px] px-3 py-0.5 rounded-full font-semibold">
          {roleLabel[staff?.role || ''] || staff?.role}
        </span>
        <p className="text-xs text-gray-500 mt-2">Ca sáng · Bắt đầu 08:00</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 px-4 mt-4">
        <div className="bg-dark-600 rounded-xl p-3 text-center border border-dark-400">
          <div className="text-lg font-bold text-orange-500">32</div>
          <div className="text-[10px] text-gray-500">Đơn hôm nay</div>
        </div>
        <div className="bg-dark-600 rounded-xl p-3 text-center border border-dark-400">
          <div className="text-lg font-bold text-orange-500">12.4M</div>
          <div className="text-[10px] text-gray-500">Doanh thu</div>
        </div>
        <div className="bg-dark-600 rounded-xl p-3 text-center border border-dark-400">
          <div className="text-lg font-bold text-orange-500">4.8⭐</div>
          <div className="text-[10px] text-gray-500">Đánh giá</div>
        </div>
      </div>

      {/* Menu: Cài đặt */}
      <div className="px-4 mt-5">
        <p className="text-[11px] text-gray-600 font-semibold uppercase mb-2">Cài đặt</p>
        <div className="bg-dark-600 rounded-xl border border-dark-400 overflow-hidden">
          <MenuItem icon="🔔" title="Thông báo" desc="Âm thanh, rung, hiển thị" href="#" />
          <MenuItem icon="🔒" title="Đổi mã PIN" desc="Cập nhật PIN đăng nhập" href="#" />
        </div>
      </div>

      {/* Menu: Quản lý (chỉ owner/manager) */}
      {(staff?.role === 'owner' || staff?.role === 'manager') && (
        <div className="px-4 mt-4">
          <p className="text-[11px] text-gray-600 font-semibold uppercase mb-2">Quản lý cửa hàng</p>
          <div className="bg-dark-600 rounded-xl border border-dark-400 overflow-hidden">
            <MenuItem icon="🖨️" title="Máy in" desc="IP LAN / Bluetooth" href="/staff/print-settings" />
            <MenuItem icon="💳" title="VietQR / Thanh toán" desc="Ngân hàng, số tài khoản" href="/staff/settings/vietqr" />
            <MenuItem icon="📱" title="QR Code bàn" desc="Xem, in QR cho từng bàn" href="/staff/qr-codes" />
            <MenuItem icon="👥" title="Nhân viên" desc="Quản lý tài khoản, phân quyền" href="#" />
            <MenuItem icon="📋" title="Menu" desc="Thêm/sửa/ẩn món" href="/staff/menu" />
            <MenuItem icon="📊" title="Báo cáo" desc="Doanh thu, thống kê" href="/admin" />
          </div>
        </div>
      )}

      {/* Menu: Hỗ trợ */}
      <div className="px-4 mt-4">
        <p className="text-[11px] text-gray-600 font-semibold uppercase mb-2">Hỗ trợ</p>
        <div className="bg-dark-600 rounded-xl border border-dark-400 overflow-hidden">
          <MenuItem icon="📖" title="Hướng dẫn sử dụng" desc="Cách dùng app, tips" href="#" />
          <MenuItem icon="💬" title="Liên hệ quản lý" desc="Gửi tin nhắn" href="#" />
          <MenuItem icon="ℹ️" title="Phiên bản" desc="NTSOFT POS v1.0.0" href="#" />
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 mt-5">
        <button
          onClick={handleLogout}
          className="w-full py-3.5 border border-red-500/50 rounded-xl text-red-400 text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          🚪 Đăng xuất
        </button>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 flex justify-around py-2.5 pb-3.5 border-t border-dark-400 z-50">
        <NavItem icon="🏠" label="Trang chủ" href="/staff" />
        <NavItem icon="🪑" label="Bàn" href="/staff/tables" />
        <NavItem icon="📝" label="Order" href="/staff/create-order" />
        <NavItem icon="📊" label="Đơn hàng" href="/staff/orders" />
        <NavItem icon="👤" label="Tài khoản" active />
      </nav>
    </div>
  );
}

function MenuItem({ icon, title, desc, href }: { icon: string; title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 border-b border-dark-400 last:border-0 hover:bg-dark-500 transition-colors"
    >
      <div className="w-8 h-8 bg-dark-500 rounded-lg flex items-center justify-center text-base">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium">{title}</div>
        <div className="text-[11px] text-gray-500">{desc}</div>
      </div>
      <span className="text-gray-600 text-sm">›</span>
    </Link>
  );
}

function NavItem({ icon, label, active, href }: { icon: string; label: string; active?: boolean; href?: string }) {
  const content = (
    <div className={cn('flex flex-col items-center gap-0.5', active ? 'text-orange-500' : 'text-gray-600')}>
      <span className="text-lg">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
