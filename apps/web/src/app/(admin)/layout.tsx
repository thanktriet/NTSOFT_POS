import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NTSOFT POS - Admin Dashboard',
  description: 'Admin management dashboard',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {children}
    </div>
  );
}
