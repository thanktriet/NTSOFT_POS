import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NTSOFT POS - Kitchen Display',
  description: 'Kitchen Display System',
};

export default function KdsLayout({
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
