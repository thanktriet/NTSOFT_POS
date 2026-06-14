import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-400 rounded-2xl flex items-center justify-center text-xl font-extrabold mx-auto mb-6">
          NT
        </div>
        <h1 className="text-3xl font-bold mb-2">NTSOFT POS</h1>
        <p className="text-gray-400 mb-8">Hệ thống quản lý nhà hàng</p>

        <div className="flex flex-col gap-3">
          <Link href="/staff/login" className="btn-primary text-center py-3">
            👨‍💼 Staff App
          </Link>
          <Link href="/kds" className="btn-secondary text-center py-3">
            👨‍🍳 Kitchen Display
          </Link>
          <Link href="/admin" className="btn-secondary text-center py-3">
            📊 Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
